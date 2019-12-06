/* eslint-env jest */
const path = require('path')

const name = 'test-stacksets'
const type = 'stackSet'
const mockAWSAcctNum = 123456789012
const mockAWSAcctNum2 = 111111111111
const templateName = 'template.yml'

const settings = [{
  type,
  name,
  templatePath: path.join(process.cwd(), templateName),
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
}]
const settings2 = [{
  type,
  name,
  templatePath: path.join(process.cwd(), templateName),
  adminS3Bucket: 'test-stacksets-admin',
  adminS3Prefix: '',
  targetsS3BucketBase: 'test-stacksets',
  targetsS3Prefix: '',
  targets: {
    [mockAWSAcctNum2]: {
      'us-east-1': true,
      'us-west-2': true
    }
  }
}]

describe('Get Settings', () => {
  jest.doMock('./awsUtils', () => {
    return {
      getAWSCurrentAccountId: async () => {
        return mockAWSAcctNum
      }
    }
  })
  const { getSettings } = require('./getSettings.js')
  test('Returns sample cfdeploy settings object read from file', () => {
    expect.assertions(1)
    return expect(getSettings()).resolves.toEqual(settings)
  })
  test('Returns sample cfdeploy settings object read from file absolute path', () => {
    expect.assertions(1)
    return expect(getSettings(`${path.join(process.cwd(), 'cfdeploy.yml')}`)).resolves.toEqual(settings)
  })
  test('Returns sample cfdeploy settings object read from file with a specified account id', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-nondefault.yml')).resolves.toEqual(settings2)
  })
  test('Returns sample cfdeploy settings object read from file when no template is set', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-noTemplatePath.yml')).resolves.toEqual(settings)
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
  test('Returns an error when admin S3 bucket name is missing in the config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-missingAdminS3Bucket.yml')).rejects.toThrow()
  })
  test('Returns an error when targets S3 bucket base is missing in the config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-missingTargetsS3BucketBase.yml')).rejects.toThrow()
  })
  test('Returns an error when an unsupported type is present in the config file', () => {
    expect.assertions(1)
    return expect(getSettings('cfdeploy-badType.yml')).rejects.toThrow()
  })
})
