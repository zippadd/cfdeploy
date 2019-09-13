/* eslint-env jest */
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const rootS3TemplatePath = 'https://test-stacksets-us-east-1.s3.amazonaws.com/template.yml'

AWS.mock('S3', 'upload', jest.fn((params, callback) => {
  const {
    Bucket,
    Key
  } = params
  return callback(null, { Location: `https://${Bucket}.s3.amazonaws.com/${Key}` })
}))

describe('Upload Template', () => {
  const { uploadTemplate } = require('./deployStackSet.js')
  test('Returns proper URL for template upload with no prefix', () => {
    expect.assertions(1)
    return expect(uploadTemplate('template.yml', 'test-stacksets-us-east-1', '')).resolves
      .toEqual(rootS3TemplatePath)
  })
  test('Returns proper URL for template upload with a prefix', () => {
    expect.assertions(1)
    return expect(uploadTemplate('template.yml', 'test-stacksets-us-east-1', 'test')).resolves
      .toEqual('https://test-stacksets-us-east-1.s3.amazonaws.com/test/template.yml')
  })
})
