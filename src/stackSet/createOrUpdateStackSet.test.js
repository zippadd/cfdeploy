/* eslint-env jest */
const uuidv4 = require('uuid/v4')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const stackSetName = 'test-stacksets'
const rootS3TemplatePath = 'https://test-stacksets-us-east-1.s3.amazonaws.com/template.yml'

AWS.mock('CloudFormation', 'updateStackSet', jest.fn((params, callback) => {
  return callback(null, { OperationId: uuidv4() })
}))

AWS.mock('CloudFormation', 'createStackSet', jest.fn((params, callback) => {
  return callback(null, {})
}))

describe('Create/Update Stack Set', () => {
  jest.doMock('./waitForStackSetOperationsComplete', () => {
    return {
      waitForStackSetOperationsComplete: async () => {}
    }
  })
  const { createOrUpdateStackSet } = require('./createOrUpdateStackSet.js')
  test('Returns when creating a new stack set', () => {
    expect.assertions(1)
    return expect(createOrUpdateStackSet(stackSetName, rootS3TemplatePath)).resolves
      .toEqual()
  })
})
