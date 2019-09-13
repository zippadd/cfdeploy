const AWS = require('aws-sdk')
const { waitForStackSetOperationsComplete } = require('./waitForStackSetOperationsComplete.js')

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

module.exports = {
  createOrUpdateStackSet
}
