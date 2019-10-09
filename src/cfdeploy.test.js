/* eslint-env jest */
const path = require('path')

const name = 'test-stacksets'
const type = 'stackSet'
const mockAWSAcctNum = 123456789012
const templateName = 'template.yml'

describe('Test cfdeploy main', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('./getSettings', () => {
      return {
        getSettings: async () => {
          return [{
            type,
            name,
            templatePath: path.join(process.cwd(), templateName),
            s3Bucket: 'test-stacksets-us-east-1',
            s3Prefix: '',
            targets: {
              [mockAWSAcctNum]: {
                'us-east-1': true,
                'us-west-2': true
              }
            }
          },
          {}]
        }
      }
    })
  })
  test('Returns a resolved promise when deployments are complete without a file path specified', async () => {
    jest.doMock('./stackSet/deployStackSet', () => {
      return {
        deployStackSet: async () => {}
      }
    })
    const { cfdeploy } = require('./cfdeploy.js')
    expect.assertions(1)
    return expect(cfdeploy()).resolves.toEqual()
  })
  test('Returns a resolved promise when deployments are complete with a file path specified', async () => {
    jest.doMock('./stackSet/deployStackSet', () => {
      return {
        deployStackSet: async () => {}
      }
    })
    process.argv.push('--file')
    process.argv.push('alternateName.yml ')
    const { cfdeploy } = require('./cfdeploy.js')
    expect.assertions(1)
    return expect(cfdeploy()).resolves.toEqual()
  })
  test('Returns a rejected promise when a deployment fails', async () => {
    jest.doMock('./stackSet/deployStackSet', () => {
      return {
        deployStackSet: async () => { throw new Error('Deployment error!') }
      }
    })
    const { cfdeploy } = require('./cfdeploy.js')
    expect.assertions(1)
    return expect(cfdeploy()).rejects.toThrow()
  })
})
