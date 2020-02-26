/* eslint-env jest */
const { v4: uuidv4 } = require('uuid')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
const path = require('path')
AWS.setSDKInstance(AWS_SDK)

const stackSetName = 'test-stacksets'
const templateFileName = 'template.yml'
const absTemplatePath = path.join(process.cwd(), templateFileName)
const rootS3TemplatePath = `https://test-stacksets-us-east-1.s3.amazonaws.com/${templateFileName}`

const createStackSetMock = jest.fn((params, callback) => {
  return callback(null, {})
})
AWS.mock('CloudFormation', 'createStackSet', createStackSetMock)

const updateStackSetMock = jest.fn((params, callback) => {
  const stackSetNotFound = new Error()
  stackSetNotFound.code = 'StackSetNotFoundException'
  return callback(stackSetNotFound, null)
})

describe('Create/Update Stack Set', () => {
  jest.doMock('./waitForStackSetOperationsComplete', () => {
    return {
      waitForStackSetOperationsComplete: async () => {}
    }
  })
  const { createOrUpdateStackSet } = require('./createOrUpdateStackSet.js')
  test('Returns when updating a stack set', async () => {
    const updateStackSetSuccessMock = jest.fn((params, callback) => {
      return callback(null, { OperationId: uuidv4() })
    })
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetSuccessMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).resolves.toEqual() &&
      expect(updateStackSetSuccessMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(0)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Returns when creating a new stack set', async () => {
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(1)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Returns when creating a new stack set when templateURL is not a URL, but a relative path', async () => {
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, templateFileName)).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(1)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Returns when creating a new stack set when templateURL is not a URL, but a abs path', async () => {
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, absTemplatePath)).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(1)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Returns when creating a new stack set with parameters', async () => {
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath, [{
      ParameterKey: 'Environment',
      ParameterValue: 'prod',
      UsePreviousValue: false
    }])).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(1)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Throws an error when a non-missing stackset error occurs updating a stack set', async () => {
    const updateStackSetExceptionMock = jest.fn((params, callback) => {
      const stackSetNotFound = new Error()
      stackSetNotFound.code = 'UnknownException'
      return callback(stackSetNotFound, null)
    })
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetExceptionMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).rejects.toBeInstanceOf(Error) &&
      expect(updateStackSetExceptionMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(0)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
})
