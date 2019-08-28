const AWS = require('aws-sdk')
const fs = require('fs-extra')
const yaml = require('js-yaml')
const cloudFormationAPIVersion = { apiVersion: '2010-05-15' }

/*
  Ensure a default region is set as AWS SDK requires it
  Assume us-east-1 as that is the AWS default (https://docs.aws.amazon.com/general/latest/gr/rande.html)
*/
const defaultRegion = 'us-east-1'
if (!AWS.config.region) {
  AWS.config.update({ region: defaultRegion })
}

const getSettings = async () => {
  const { settings } = yaml.safeLoad(await fs.readFile('cfdeploy.yml', 'utf-8'))

  const {
    stackSetName,
    templatePath = 'template.yml',
    s3Bucket,
    s3Key = '',
    targets
  } = settings

  if (!stackSetName) {
    throw new Error('Need to provide stack set name')
  }

  if (!s3Bucket) {
    throw new Error('Need to provide S3 bucket name')
  }

  const sts = new AWS.STS({ apiVersion: '2011-06-15' })
  const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
  if (targets.default && !targets[defaultAccountId]) {
    targets[defaultAccountId] = targets.default
    delete targets.default
  }

  settings.templatePath = templatePath
  settings.s3Key = s3Key
  settings.targets = targets

  return settings
}

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

const createOrUpdateStackSet = async (stackSetName, templateURL) => {
  const cloudformation = new AWS.CloudFormation(cloudFormationAPIVersion)
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

const adjustInstances = async (stackSetName, targets) => {
  const cloudformation = new AWS.CloudFormation(cloudFormationAPIVersion)
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

const main = async () => {
  const { stackSetName, templatePath, s3Bucket, s3Key, targets } = await getSettings()

  const templateURL = await uploadTemplate(templatePath, s3Bucket, s3Key)

  /* Update/create Stack Set */
  await createOrUpdateStackSet(stackSetName, templateURL)

  /* Check and make stack set instance adjustments if needed */
  await adjustInstances(stackSetName, targets)
}

main()
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
