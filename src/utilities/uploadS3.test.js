/* eslint-env jest */
const path = require('path')
const os = require('os')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const bucketName = 'test-stacksets-us-east-1'
const templateName = 'template.yml'
const urlRoot = `https://${bucketName}.s3.amazonaws.com`
const s3URLRoot = `s3://${bucketName}`

AWS.mock('S3', 'upload', jest.fn((params, callback) => {
  const {
    Bucket,
    Key
  } = params
  return callback(null, { Location: `https://${Bucket}.s3.amazonaws.com/${Key}`, Bucket, Key })
}))

describe('Upload Template', () => {
  const { uploadS3, modes } = require('./uploadS3.js')
  const { hashFile } = require('./hashFile.js')
  test('Returns proper URL for template upload with no prefix', () => {
    expect.assertions(1)
    return expect(uploadS3(templateName, bucketName, '')).resolves
      .toEqual({
        url: `${urlRoot}/${templateName}`,
        s3URL: `${s3URLRoot}/${templateName}`,
        bucket: bucketName,
        key: templateName
      })
  })
  test('Returns proper URL for template upload with a prefix', () => {
    expect.assertions(1)
    return expect(uploadS3(templateName, bucketName, 'test')).resolves
      .toEqual({
        url: `${urlRoot}/test/${templateName}`,
        s3URL: `${s3URLRoot}/test/${templateName}`,
        bucket: bucketName,
        key: `test/${templateName}`
      })
  })
  test('Returns proper URL for template upload with a prefix with trailing slash', () => {
    expect.assertions(1)
    return expect(uploadS3(templateName, bucketName, 'test/')).resolves
      .toEqual({
        url: `${urlRoot}/test/${templateName}`,
        s3URL: `${s3URLRoot}/test/${templateName}`,
        bucket: bucketName,
        key: `test/${templateName}`
      })
  })
  test('Returns proper URL for absolute pathed template upload with a prefix with trailing slash', () => {
    expect.assertions(1)
    return expect(uploadS3(`${path.join(process.cwd(), templateName)}`, bucketName, 'test/')).resolves
      .toEqual({
        url: `${urlRoot}/test/${templateName}`,
        s3URL: `${s3URLRoot}/test/${templateName}`,
        bucket: bucketName,
        key: `test/${templateName}`
      })
  })
  test('Returns proper URL for absolute pathed template upload with a prefix with trailing slash and autoPath', () => {
    expect.assertions(1)
    return expect(uploadS3(`${path.join(process.cwd(), templateName)}`, bucketName, 'test/', { autoPath: true })).resolves
      .toEqual({
        url: `${urlRoot}/test${process.cwd()}/${templateName}`,
        s3URL: `${s3URLRoot}/test${process.cwd()}/${templateName}`,
        bucket: bucketName,
        key: `test${process.cwd()}/${templateName}`
      })
  })
  test('Returns proper URL for absolute pathed template upload with a prefix with trailing slash and forced archiving', () => {
    expect.assertions(1)
    return expect(uploadS3(`${path.join(process.cwd(), templateName)}`, bucketName, 'test/', { mode: modes.archive })).resolves
      .toEqual({
        url: `${urlRoot}/test/${templateName}.zip`,
        s3URL: `${s3URLRoot}/test/${templateName}.zip`,
        bucket: bucketName,
        key: `test/${templateName}.zip`
      })
  })
  test('Returns proper URL for absolute pathed template upload with a prefix with trailing slash and hash versioning', async () => {
    expect.assertions(1)
    const resp = await uploadS3(`${path.join(process.cwd(), templateName)}`, bucketName, 'test/', { hashVersioning: true })
    const hash = await hashFile(`${path.join(process.cwd(), templateName)}`)
    return expect(resp).toEqual({
      url: `${urlRoot}/test/${templateName}/${hash}/${templateName}`,
      s3URL: `${s3URLRoot}/test/${templateName}/${hash}/${templateName}`,
      bucket: bucketName,
      key: `test/${templateName}/${hash}/${templateName}`
    })
  })
  test('Returns proper URL for absolute pathed template upload with a prefix with trailing slash, forced archiving, and hash versioning', async () => {
    expect.assertions(1)
    const resp = await uploadS3(`${path.join(process.cwd(), templateName)}`, bucketName, 'test/', { mode: modes.archive, hashVersioning: true })
    const hash = await hashFile(`${path.join(os.tmpdir(), process.cwd(), templateName)}.zip`)
    return expect(resp).toEqual({
      url: `${urlRoot}/test/${templateName}/${hash}/${templateName}.zip`,
      s3URL: `${s3URLRoot}/test/${templateName}/${hash}/${templateName}.zip`,
      bucket: bucketName,
      key: `test/${templateName}/${hash}/${templateName}.zip`
    })
  })
})
describe('Upload Code', () => {
  const { uploadS3 } = require('./uploadS3.js')
  const codePrefix = 'lambda/function'
  const codeDirBase = 'packages/dummyFunction'
  const codeDir = `./${codeDirBase}`
  const codeFile = `${codeDirBase}.zip`
  test('Returns a proper URL for uploaded code with autopath', () => {
    expect.assertions(1)
    return expect(uploadS3(codeDir, bucketName, codePrefix, { autoPath: true })).resolves
      .toEqual({
        url: `${urlRoot}/${codePrefix}/${codeFile}`,
        s3URL: `${s3URLRoot}/${codePrefix}/${codeFile}`,
        bucket: bucketName,
        key: `${codePrefix}/${codeFile}`
      })
  })
})
