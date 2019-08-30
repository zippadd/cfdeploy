/* eslint-env jest */
const {
  getSettings,
  /* waitForStackSetOperationsComplete, */
  uploadTemplate /* ,
  createOrUpdateStackSet,
  adjustInstances,
  deployStackSet */
} = require('./deployStackSet.js')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

/* Set mock AWS account number */
/* AWS Account numbers are 12 digits so set a corresponding max and min */
const AWS_ACCT_NUM_MAX = 999999999999
const AWS_ACCT_NUM_MIN = /* 00000000000 */1
const mockAWSAcctNum = Math.floor(Math.random() * (AWS_ACCT_NUM_MAX - AWS_ACCT_NUM_MIN) - AWS_ACCT_NUM_MIN)

/* Set Up AWS Mocks */
AWS.mock('STS', 'getCallerIdentity', jest.fn((params, callback) => {
  return callback(null, { Account: mockAWSAcctNum })
}))
AWS.mock('S3', 'upload', jest.fn((params, callback) => {
  const {
    Bucket,
    Key
  } = params
  return callback(null, { Location: `https://${Bucket}.s3.amazonaws.com/${Key}` })
}))

describe('Get Settings', () => {
  test('Returns sample cfdeploy settings object read from file', () => {
    expect.assertions(1)
    return expect(getSettings()).resolves.toEqual({
      stackSetName: 'test-stacksets',
      templatePath: 'template.yml',
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
})

describe('Upload Template', () => {
  test('Returns proper URL for template upload with no prefix', () => {
    expect.assertions(1)
    return expect(uploadTemplate('template.yml', 'test-stacksets-us-east-1', '')).resolves
      .toEqual('https://test-stacksets-us-east-1.s3.amazonaws.com/template.yml')
  })
  test('Returns proper URL for template upload with a prefix', () => {
    expect.assertions(1)
    return expect(uploadTemplate('template.yml', 'test-stacksets-us-east-1', 'test')).resolves
      .toEqual('https://test-stacksets-us-east-1.s3.amazonaws.com/test/template.yml')
  })
})
