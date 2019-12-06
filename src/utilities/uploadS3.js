const AWS = require('aws-sdk')
const fs = require('fs-extra')
const path = require('path')
const { archiveFilePath, archiveFormats } = require('./archiveFilePath.js')
const { hashFile } = require('./hashFile.js')

const modes = {
  copy: 'copy',
  archive: 'archive'
}

const normalizePathToS3 = (fsPath) => {
  const multipleBckSlashRegex = new RegExp('\\+', 'g')
  return path.normalize(fsPath).replace(multipleBckSlashRegex, '/')
}

const normalizeS3Key = (s3Key) => {
  const multipleFwdSlashRegex = new RegExp('/+', 'g')
  const leadingFwdSlashRegex = new RegExp('^/+')
  const trailingFwdSlashRegex = new RegExp('/+$')

  return s3Key.replace(multipleFwdSlashRegex, '/').replace(leadingFwdSlashRegex, '').replace(trailingFwdSlashRegex, '')
}

const uploadS3 = async (localPath, s3Bucket, s3Prefix, options = {}) => {
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' })
  const opts = {
    autoPath: false,
    mode: modes.copy,
    archiveFormat: archiveFormats.zip,
    hashVersioning: false
  }
  Object.assign(opts, options)

  const isDir = (await fs.stat(localPath)).isDirectory()
  const s3Path = normalizePathToS3(localPath)
  const { base, dir } = path.parse(s3Path)
  let archivedFilePath = ''

  if (isDir || opts.mode === modes.archive) {
    archivedFilePath = await archiveFilePath(localPath, opts.archiveFormat)
  }

  const fileName = archivedFilePath ? path.basename(archivedFilePath) : base
  const directory = dir
  const filePath = archivedFilePath || localPath

  let hashPath = ''
  if (opts.hashVersioning) {
    const hash = archivedFilePath ? await hashFile(archivedFilePath) : await hashFile(localPath)
    hashPath = `${base}/${hash}`
  }

  const s3Key = `${s3Prefix}/${opts.autoPath ? directory : ''}/${hashPath}/${fileName}`

  const fileReadStream = fs.createReadStream(filePath)
  const s3UploadParams = {
    Bucket: s3Bucket,
    Key: normalizeS3Key(s3Key),
    ServerSideEncryption: 'AES256',
    Body: fileReadStream
  }
  const { Location: url, Bucket: bucket, Key: key } = await s3.upload(s3UploadParams).promise()
  const s3URL = `s3://${bucket}/${key}`
  return { url, s3URL, bucket, key }
}

module.exports = {
  uploadS3, archiveFormats, modes
}
