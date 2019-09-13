const AWS = require('aws-sdk')
const { waitForStackSetOperationsComplete } = require('./waitForStackSetOperationsComplete.js')

const adjustInstances = async (stackSetName, targets) => {
  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const listStackInstancesParams = {
    StackSetName: stackSetName
  }
  const { Summaries: stackInstanceSummaries } = await cloudformation.listStackInstances(listStackInstancesParams).promise()

  const deleteTargets = {}

  for (const stackInstanceSummary of stackInstanceSummaries) {
    const { Account: account, Region: region, Status: status } = stackInstanceSummary

    if (status === 'INOPERABLE') {
      continue
    }

    if (!targets[account] || !targets[account][region]) {
      deleteTargets[account] ? deleteTargets[account].push(region) : deleteTargets[account] = [region]
    } else {
      /* Mark this as a completed target by removing from the list
      NOTE: should be ok to as calls to CreateStackInstances do NOT
      create additional instances where one already exist. Thus we
      should not get duplicates in regions for an account id */
      delete targets[account][region]
    }
  }

  const createStackInstancePromises = []

  for (const account of Object.keys(targets)) {
    const createStackInstanceParams = {
      StackSetName: stackSetName,
      Accounts: [account],
      Regions: Object.keys(targets[account])
    }

    if (createStackInstanceParams.Regions.length > 0) {
      createStackInstancePromises.push(cloudformation.createStackInstances(createStackInstanceParams).promise())
    }
  }

  const createStackInstanceOpIds = (await Promise.all(createStackInstancePromises)).map((data) => {
    return data.OperationId
  })

  await waitForStackSetOperationsComplete(stackSetName, createStackInstanceOpIds)

  const deleteStackInstancePromises = []

  for (const account of Object.keys(deleteTargets)) {
    const deleteStackInstanceParams = {
      StackSetName: stackSetName,
      Accounts: [account],
      Regions: deleteTargets[account],
      RetainStacks: false
    }

    if (deleteStackInstanceParams.Regions.length > 0) {
      deleteStackInstancePromises.push(cloudformation.deleteStackInstances(deleteStackInstanceParams).promise())
    }
  }

  const deleteStackInstanceOpIds = (await Promise.all(deleteStackInstancePromises)).map((data) => {
    return data.OperationId
  })

  await waitForStackSetOperationsComplete(stackSetName, deleteStackInstanceOpIds)
}

module.exports = {
  adjustInstances
}
