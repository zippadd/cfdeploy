/* eslint-env jest */
const uuidv4 = require('uuid/v4')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const stackSetName = 'test-stacksets'
const rootS3TemplatePath = 'https://test-stacksets-us-east-1.s3.amazonaws.com/template.yml'

const createStackSetMock = jest.fn((params, callback) => {
  return callback(null, {})
})
AWS.mock('CloudFormation', 'createStackSet', createStackSetMock)

describe('Create/Update Stack Set', () => {
  jest.doMock('./waitForStackSetOperationsComplete', () => {
    return {
      waitForStackSetOperationsComplete: async () => {}
    }
  })
  const { createOrUpdateStackSet } = require('./createOrUpdateStackSet.js')
  test('Returns when updating a stack set', async () => {
    const updateStackSetMock = jest.fn((params, callback) => {
      return callback(null, { OperationId: uuidv4() })
    })
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(0)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Returns when creating a new stack set', async () => {
    const updateStackSetMock = jest.fn((params, callback) => {
      const stackSetNotFound = new Error()
      stackSetNotFound.code = 'StackSetNotFoundException'
      return callback(stackSetNotFound, null)
    })
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).resolves.toEqual() &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(1)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
  test('Throws an error when a non-missing stackset error occurs updating a stack set', async () => {
    const updateStackSetMock = jest.fn((params, callback) => {
      const stackSetNotFound = new Error()
      stackSetNotFound.code = 'UnknownException'
      return callback(stackSetNotFound, null)
    })
    AWS.mock('CloudFormation', 'updateStackSet', updateStackSetMock)
    expect.assertions(1)
    const result = await expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).rejects.toBeInstanceOf(Error) &&
      expect(updateStackSetMock).toHaveBeenCalledTimes(1) &&
      expect(createStackSetMock).toHaveBeenCalledTimes(0)
    AWS.restore('CloudFormation', 'updateStackSet')
    return result
  })
})
