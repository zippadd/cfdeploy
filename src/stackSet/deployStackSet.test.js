/* eslint-env jest */

const getPsuedoRandBetween = (minNum, maxNum) => {
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

/* AWS Account numbers are 12 digits so set a corresponding max and min */
const AWS_ACCT_NUM_MAX = 999999999999
const AWS_ACCT_NUM_MIN = /* 00000000000 */1
const name = 'test-stacksets'
const type = 'stackSet'
const mockAWSAcctNum = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)

const deployment = {
  type,
  name,
  templatePath: 'template.yml',
  adminS3Bucket: 'test-stacksets-admin',
  adminS3Prefix: '',
  targetsS3BucketBase: 'test-stacksets',
  targetsS3Prefix: '',
  targets: {
    [mockAWSAcctNum]: {
      'us-east-1': true,
      'us-west-2': true
    }
  }
}
const opts = {}

describe('Deploy Stack Set Flow', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('./waitForStackSetOperationsComplete', () => {
      return {
        waitForStackSetOperationsComplete: async () => {}
      }
    })
    jest.doMock('./artifactUpload', () => {
      return {
        artifactUpload: async () => { return { url: '' } }
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
    return expect(deployStackSet(deployment, opts)).resolves.toEqual()
  })
  test('Returns when attempting a deployment without region set in direct mode', async () => {
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
    return expect(deployStackSet(deployment, { direct: true })).resolves.toEqual()
  })
  test('Returns when attempting a deployment without region set in prod environment', async () => {
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
    return expect(deployStackSet(deployment, { environment: 'prod' })).resolves.toEqual()
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
    return expect(deployStackSet(deployment, opts)).resolves.toEqual()
  })
  test('Throws an error when trying to deploy a non-stackSet type', async () => {
    const { deployStackSet } = require('./deployStackSet.js')
    expect.assertions(1)
    const badDeployment = Object.assign({}, deployment)
    badDeployment.type = 'notValid'
    return expect(deployStackSet(badDeployment, opts)).rejects.toThrow()
  })
})
