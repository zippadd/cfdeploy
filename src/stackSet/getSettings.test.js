/* eslint-env jest */
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const getPsuedoRandBetween = (minNum, maxNum) => {
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

/* AWS Account numbers are 12 digits so set a corresponding max and min */
const AWS_ACCT_NUM_MAX = 999999999999
const AWS_ACCT_NUM_MIN = /* 00000000000 */1
const stackSetName = 'test-stacksets'
const mockAWSAcctNum = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)

AWS.mock('STS', 'getCallerIdentity', jest.fn((params, callback) => {
  return callback(null, { Account: mockAWSAcctNum })
}))

describe('Get Settings', () => {
  const { getSettings } = require('./getSettings.js')
  test('Returns sample cfdeploy settings object read from file', () => {
    expect.assertions(1)
    return expect(getSettings()).resolves.toEqual({
      stackSetName,
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
