/* eslint-env jest */
const mockAWSAcctNum = 123456789012
const testRegion = 'us-west-1'
const defaultRegion = 'us-east-1'

describe('Test AWS Utils', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.isolateModules(() => {
      require('aws-sdk')
    })
  })
  test('Returns mock AWS account number', () => {
    const AWS = require('aws-sdk-mock')
    const AWS_SDK = require('aws-sdk')
    AWS.setSDKInstance(AWS_SDK)
    AWS.mock('STS', 'getCallerIdentity', jest.fn((params, callback) => {
      return callback(null, { Account: mockAWSAcctNum })
    }))
    const { getAWSCurrentAccountId } = require('./awsUtils.js')
    expect.assertions(1)
    return expect(getAWSCurrentAccountId()).resolves.toEqual(mockAWSAcctNum)
  })
  test('Returns test region when set to the test region', () => {
    jest.doMock('aws-sdk', () => {
      return {
        config: {
          update: () => {},
          region: 'us-west-1'
        }
      }
    })
    const { getAWSCurrentOrDefaultRegion } = require('./awsUtils.js')
    expect.assertions(1)
    return expect(getAWSCurrentOrDefaultRegion()).toEqual(testRegion)
  })
  test('Returns default region when no region is set', () => {
    jest.doMock('aws-sdk', () => {
      return {
        config: {
          update: () => {},
          region: ''
        }
      }
    })
    const { getAWSCurrentOrDefaultRegion } = require('./awsUtils.js')
    expect.assertions(1)
    return expect(getAWSCurrentOrDefaultRegion()).toEqual(defaultRegion)
  })
})
