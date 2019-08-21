const AWS = require('aws-sdk')
const fs = require('fs')

/* Will use file only for now. Maybe add cmd args later */
// const test = process.argv.slice(2)
// console.log(test)

const waitForStackSetOperationsComplete = async (stackSetName, operationIds) => {
  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const opIds = new Set(operationIds)

  while (opIds.size > 0) {
    let stackInstanceOpIdsToReview = opIds.size
    let nextToken = true

    while (nextToken) {
      const listStackSetOperationsParams = {
        StackSetName: stackSetName
      }
      const { Summaries: summaries, NextToken } = await cloudformation.listStackSetOperations(listStackSetOperationsParams).promise()
      nextToken = NextToken

      for (const summary of summaries) {
        const { OperationId: operationId, Status: status } = summary
        if (opIds.has(operationId)) {
          switch (status) {
            case 'FAILED':
            case 'STOPPED':
            case 'STOPPING':
              throw new Error('Stack update failed or was cancelled. Review stack set events to determine cause.')

            case 'SUCCEEDED':
              opIds.delete(operationId)
              break

            case 'RUNNING':
              break

            default:
              throw new Error('Unrecognized StackSet Operation!')
          }
          stackInstanceOpIdsToReview--
        }

        if (stackInstanceOpIdsToReview <= 0) {
          nextToken = false
          break
        }
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 5 * 1000)
      })
    }
  }
}

const createOrUpdateStackSet = async (stackSetName, templateURL) => {
  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const stackSetParams = {
    StackSetName: stackSetName,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    TemplateURL: templateURL
  }
  try {
    const { OperationId } = await cloudformation.updateStackSet(stackSetParams).promise()
    await waitForStackSetOperationsComplete(stackSetName, [OperationId])
  } catch (err) {
    if (err.code !== 'StackSetNotFoundException') {
      throw err
    }
    await cloudformation.createStackSet(stackSetParams).promise()
  }
}

const uploadTemplate = async (templatePath, s3Bucket, s3Key) => {
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
  const s3FullKey = s3Key ? `${s3Key}/${templatePath}` : templatePath
  const templateReadStream = fs.createReadStream(templatePath)
  const s3UploadParams = {
    Bucket: s3Bucket,
    Key: s3FullKey,
    ServerSideEncryption: 'AES256',
    Body: templateReadStream
  }
  const { Location: templateURL } = await s3.upload(s3UploadParams).promise()
  return templateURL
}

const main = async () => {
  /* Get params from file - temp use hard code */
  const stackSetName = 'test-stacksets'
  const templatePath = 'template.yml'
  const s3Bucket = 'test-stacksets-us-east-1'
  const s3Key = ''
  const defaultRegion = 'us-east-1'

  if (!AWS.config.region) {
    AWS.config.update({ region: defaultRegion })
  }

  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const sts = new AWS.STS({ apiVersion: '2011-06-15' })

  const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
  const targets = { [defaultAccountId]: { 'us-east-1': true, 'us-west-2': true } }

  const templateURL = uploadTemplate(templatePath, s3Bucket, s3Key)

  /* Update/create Stack Set */
  await createOrUpdateStackSet(stackSetName, templateURL)

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
