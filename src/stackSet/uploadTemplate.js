const AWS = require('aws-sdk')
const fs = require('fs-extra')

const uploadTemplate = async (localTemplatePath, s3Bucket, s3Prefix) => {
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
  const s3Key = s3Prefix ? `${s3Prefix}/${localTemplatePath}` : localTemplatePath
  const templateReadStream = fs.createReadStream(localTemplatePath)
  const s3UploadParams = {
    Bucket: s3Bucket,
    Key: s3Key,
    ServerSideEncryption: 'AES256',
    Body: templateReadStream
  }
  const { Location: templateURL } = await s3.upload(s3UploadParams).promise()
  return templateURL
}

module.exports = {
  uploadTemplate
}
