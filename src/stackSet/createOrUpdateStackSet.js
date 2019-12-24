const AWS = require('aws-sdk')
const fs = require('fs-extra')
const path = require('path')
const { waitForStackSetOperationsComplete } = require('./waitForStackSetOperationsComplete.js')
const { isURL } = require('../utilities/isURL.js')

const createOrUpdateStackSet = async (stackSetName, templateURL, parameters = '') => {
  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })

  let TemplateURL
  let TemplateBody
  if (isURL(templateURL)) {
    TemplateURL = templateURL
  } else {
    const absFilePath = path.isAbsolute(templateURL) ? templateURL : path.join(process.cwd(), templateURL)
    TemplateBody = await fs.readFile(absFilePath, 'utf-8')
  }

  let Parameters
  if (!parameters || parameters.length <= 0) {
    Parameters = ''
  } else {
    Parameters = parameters
  }

  const stackSetParams = {
    StackSetName: stackSetName,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    ...TemplateURL ? { TemplateURL } : {}, // Only set TemplateURL if is truthy
    ...TemplateBody ? { TemplateBody } : {}, // Only set TemplateBody if is truthy
    ...Parameters ? { Parameters } : {} // Only set TemplateBody if is truthy and has elements
  }
  try {
    const { OperationId } = await cloudformation.updateStackSet(stackSetParams).promise()
    await waitForStackSetOperationsComplete(stackSetName, [OperationId])
  } catch (err) {
    console.log('Hello')
    console.log(err)
    if (err.code !== 'StackSetNotFoundException') {
      throw err
    }
    await cloudformation.createStackSet(stackSetParams).promise()
  }
}

module.exports = {
  createOrUpdateStackSet
}
