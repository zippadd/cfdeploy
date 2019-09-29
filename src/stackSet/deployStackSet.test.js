/* eslint-env jest */
/* const uuidv4 = require('uuid/v4') */

const getPsuedoRandBetween = (minNum, maxNum) => {
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

/* AWS Account numbers are 12 digits so set a corresponding max and min */
const AWS_ACCT_NUM_MAX = 999999999999
const AWS_ACCT_NUM_MIN = /* 00000000000 */1
const stackSetName = 'test-stacksets'
const mockAWSAcctNum = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)

describe('Deploy Stack Set Flow', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('./getSettings', () => {
      return {
        getSettings: async () => {
          return {
            stackSetName: stackSetName,
            templatePath: 'template.yml',
            s3Bucket: 'test-stacksets-us-east-1',
            s3Key: '',
            targets: {
              [mockAWSAcctNum]: {
                'us-east-1': true,
                'us-west-2': true
              }
            }
          }
        }
      }
    })
    jest.doMock('./waitForStackSetOperationsComplete', () => {
      return {
        waitForStackSetOperationsComplete: async () => {}
      }
    })
    jest.doMock('./uploadTemplate', () => {
      return {
        uploadTemplate: async () => {}
      }
    })
    jest.doMock('./createOrUpdateStackSet', () => {
      return {
        createOrUpdateStackSet: async () => {}
      }
    })
    jest.doMock('./adjustInstances', () => {
      return {
        adjustInstances: async () => {}
      }
    })
    jest.isolateModules(() => {
      require('aws-sdk')
    })
  })
  test('Returns when attempting a deployment without region set', async () => {
    jest.doMock('aws-sdk', () => {
      return {
        config: {
          update: () => {},
          region: ''
        }
      }
    })
    const { deployStackSet } = require('./deployStackSet.js')
    expect.assertions(1)
    return expect(deployStackSet()).resolves.toEqual()
  })
  test('Returns when attempting a deployment with region set', async () => {
    jest.doMock('aws-sdk', () => {
      return {
        config: {
          update: () => {},
          region: 'us-east-1'
        }
      }
    })
    const { deployStackSet } = require('./deployStackSet.js')
    expect.assertions(1)
    return expect(deployStackSet()).resolves.toEqual()
  })
})
