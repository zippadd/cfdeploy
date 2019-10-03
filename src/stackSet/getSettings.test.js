/* eslint-env jest */
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)
const path = require('path')

const stackSetName = 'test-stacksets'
const mockAWSAcctNum = 123456789012
const mockAWSAcctNum2 = 111111111111
const templateName = 'template.yml'

AWS.mock('STS', 'getCallerIdentity', jest.fn((params, callback) => {
  return callback(null, { Account: mockAWSAcctNum })
}))

describe('Get Settings', () => {
  const { getSettings } = require('./getSettings.js')
  test('Returns sample cfdeploy settings object read from file', () => {
    expect.assertions(1)
    return expect(getSettings()).resolves.toEqual({
      stackSetName,
      templatePath: path.join(process.cwd(), templateName),
      s3Bucket: 'test-stacksets-us-east-1',
      s3Prefix: '',
      targets: {
        [mockAWSAcctNum]: {
          'us-east-1': true,
          'us-west-2': true
        }
      }
    })
  })
  test('Returns sample cfdeploy settings object read from file with a specified account id', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-nondefault.yml')).resolves.toEqual({
      stackSetName,
      templatePath: path.join(process.cwd(), templateName),
      s3Bucket: 'test-stacksets-us-east-1',
      s3Prefix: '',
      targets: {
        [mockAWSAcctNum2]: {
          'us-east-1': true,
          'us-west-2': true
        }
      }
    })
  })
  test('Returns sample cfdeploy settings object read from file when no template is set', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-noTemplatePath.yml')).resolves.toEqual({
      stackSetName,
      templatePath: path.join(process.cwd(), templateName),
      s3Bucket: 'test-stacksets-us-east-1',
      s3Prefix: '',
      targets: {
        [mockAWSAcctNum]: {
          'us-east-1': true,
          'us-west-2': true
        }
      }
    })
  })
  test('Returns an error for a malformed config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-malformed.yml')).rejects.toThrow()
  })
  test('Returns an error when duplicate ids are present', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-duplicateIds.yml')).rejects.toThrow()
  })
  test('Returns an error when duplicate ids with a default are present', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-duplicateIdsDefault.yml')).rejects.toThrow()
  })
  test('Returns an error when stack name is missing in the config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-missingName.yml')).rejects.toThrow()
  })
  test('Returns an error when stack name is missing in the config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-missingS3Bucket.yml')).rejects.toThrow()
  })
})
