const AWS = require('aws-sdk')
const fs = require('fs')

/* Will use file only for now. Maybe add cmd args later */
// const test = process.argv.slice(2)
// console.log(test)

const main = async () => {
  /* Get params from file - temp use hard code */
  const stackSetName = 'test-stacksets'
  const templateName = 'template.yml'
  const s3Bucket = 'test-stacksets-us-east-1'
  const s3Key = ''
  const defaultRegion = 'us-east-1'

  if (!AWS.config.region) {
    AWS.config.update({ region: defaultRegion })
  }

  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
  const sts = new AWS.STS({ apiVersion: '2011-06-15' })

  const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
  const targets = { [defaultAccountId]: { 'us-east-1': true, 'us-west-2': true } }

  const s3FullKey = s3Key ? `${s3Key}/${templateName}` : templateName
  const templateReadStream = fs.createReadStream(templateName)
  const s3UploadParams = {
    Bucket: s3Bucket,
    Key: s3FullKey,
    ServerSideEncryption: 'AES256',
    Body: templateReadStream
  }
  const { Location: templateURL } = await s3.upload(s3UploadParams).promise()

  const stackSetParams = {
    StackSetName: stackSetName,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    TemplateURL: templateURL
  }
  try {
    const { OperationId } = await cloudformation.updateStackSet(stackSetParams).promise()

    let operationNotDone = true
    do {
      const describeStackSetOpParams = {
        OperationId,
        StackSetName: stackSetName
      }

      const { StackSetOperation: { Status } } = await cloudformation.describeStackSetOperation(describeStackSetOpParams).promise()

      switch (Status) {
        case 'FAILED':
        case 'STOPPED':
        case 'STOPPING':
          throw new Error('Stack update failed or was cancelled. Review stack set events to determine cause.')

        case 'SUCCEEDED':
          operationNotDone = false
          break

        case 'RUNNING':
          await new Promise((resolve) => {
            setTimeout(resolve, 10 * 1000)
          })
          break

        default:
          throw new Error('Unrecognized StackSet Operation!')
      }
    } while (operationNotDone)
  } catch (err) {
    if (err.code !== 'StackSetNotFoundException') {
      throw err
    }

    await cloudformation.createStackSet(stackSetParams).promise()
  }

  /* Check and make stack set instance adjustments if needed */
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

  console.log(targets[defaultAccountId])

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

  const createStackInstanceOpIds = new Set((await Promise.all(createStackInstancePromises)).map((data) => {
    return data.OperationId
  }))

  while (createStackInstanceOpIds.size > 0) {
    console.log(createStackInstanceOpIds)
    let stackInstanceOpIdsToReview = createStackInstanceOpIds.size
    let nextToken = true

    while (nextToken) {
      const listStackSetOperationsParams = {
        StackSetName: stackSetName
      }
      const { Summaries: summaries, NextToken } = await cloudformation.listStackSetOperations(listStackSetOperationsParams).promise()
      nextToken = NextToken
      console.log(nextToken)

      for (const summary of summaries) {
        const { OperationId: operationId, Status: status } = summary
        console.log(operationId)
        console.log(status)
        if (createStackInstanceOpIds.has(operationId)) {
          switch (status) {
            case 'FAILED':
            case 'STOPPED':
            case 'STOPPING':
              throw new Error('Stack update failed or was cancelled. Review stack set events to determine cause.')

            case 'SUCCEEDED':
              createStackInstanceOpIds.delete(operationId)
              break

            case 'RUNNING':
              break

            default:
              throw new Error('Unrecognized StackSet Operation!')
          }
          stackInstanceOpIdsToReview--
        }

        console.log(stackInstanceOpIdsToReview)
        if (stackInstanceOpIdsToReview <= 0) {
          nextToken = false
          break
        }
      }

      /*
      if (!nextToken && stackInstanceOpIdsToReview > 0) {
        throw new Error('Outstanding operations still to review, but no next token available')
      } */

      await new Promise((resolve) => {
        setTimeout(resolve, 10 * 1000)
      })
    }
  }

  /*
  const createStackInstanceOpIds = (Promise.all(createStackInstancePromises)).sort()

  while (createStackInstanceOpIds.length > 0) {
    // TODO: Deal with pagination
    const { Summaries } = await cloudformation.listStackSetOperations({ StackSetName: stackSetName }).promise()
    const stackSetOpsSummaries = Summaries.sort((a, b) => {
      return a.OperationId.localeCompare(b.OperationId)
    })
  } */
  /* Do the deletes */
}

main()
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
