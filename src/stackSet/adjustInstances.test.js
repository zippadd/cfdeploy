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
const mockAWSAcctNum2 = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)
const mockAWSAcctNum3 = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)
const mockAWSAcctNum4 = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)
const mockAWSAcctNum5 = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)

const targets = {
  [mockAWSAcctNum]: {
    'us-east-1': true,
    'us-west-2': true,
    'us-east-2': true
  },
  [mockAWSAcctNum3]: {
    'us-east-1': true
  },
  [mockAWSAcctNum4]: {
    'us-east-1': true,
    'us-west-2': true
  },
  [mockAWSAcctNum5]: {
    'us-west-1': true
  }
}

AWS.mock('CloudFormation', 'listStackInstances', jest.fn((params, callback) => {
  const stackInstanceSummaries = [
    { Account: mockAWSAcctNum, Region: 'us-east-1', Status: 'CURRENT' },
    { Account: mockAWSAcctNum2, Region: 'us-east-1', Status: 'CURRENT' },
    { Account: mockAWSAcctNum2, Region: 'us-east-2', Status: 'CURRENT' },
    { Account: mockAWSAcctNum2, Region: 'us-west-2', Status: 'CURRENT' },
    { Account: mockAWSAcctNum3, Region: 'us-east-1', Status: 'CURRENT' },
    { Account: mockAWSAcctNum3, Region: 'us-east-2', Status: 'CURRENT' },
    { Account: mockAWSAcctNum3, Region: 'us-west-2', Status: 'CURRENT' },
    { Account: mockAWSAcctNum3, Region: 'us-west-1', Status: 'INOPERABLE' },
    { Account: mockAWSAcctNum5, Region: 'us-east-1', Status: 'CURRENT' }
  ]
  return callback(null, { Summaries: stackInstanceSummaries })
}))

const createStackInstancesMock = jest.fn((params, callback) => {
  return callback(null, {})
})
AWS.mock('CloudFormation', 'createStackInstances', createStackInstancesMock)

const deleteStackInstancesMock = jest.fn((params, callback) => {
  return callback(null, {})
})
AWS.mock('CloudFormation', 'deleteStackInstances', deleteStackInstancesMock)

describe('Adjust instances to match settings', () => {
  jest.doMock('./waitForStackSetOperationsComplete', () => {
    return {
      waitForStackSetOperationsComplete: async () => {}
    }
  })
  const { adjustInstances } = require('./adjustInstances.js')
  test('Returns when creating a new stack set', async () => {
    expect.assertions(1)
    return await expect(adjustInstances(stackSetName, targets)).resolves.toEqual() &&
      expect(createStackInstancesMock).toHaveBeenCalledWith(
        { StackSetName: stackSetName, Accounts: mockAWSAcctNum, Regions: ['us-west-2', 'us-east-2'] },
        { StackSetName: stackSetName, Accounts: mockAWSAcctNum4, Regions: ['us-east-1', 'us-west-2'] }
      ) &&
      expect(deleteStackInstancesMock).toHaveBeenCalledWith(
        { StackSetName: stackSetName, Accounts: mockAWSAcctNum2, Regions: ['us-east-1', 'us-east-2', 'us-west-1'] },
        { StackSetName: stackSetName, Accounts: mockAWSAcctNum3, Regions: ['us-east-2', 'us-west-2'] }
      )
  })
})
