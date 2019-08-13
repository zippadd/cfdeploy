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
  // const regions = ['us-east-1', 'us-west-2']

  if (!AWS.config.region) {
    AWS.config.update({ region: defaultRegion })
  }

  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

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
}

main()
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
  })
