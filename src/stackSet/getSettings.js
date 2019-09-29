const AWS = require('aws-sdk')
const yaml = require('js-yaml')
const fs = require('fs-extra')

const getSettings = async () => {
  const { settings } = yaml.safeLoad(await fs.readFile('cfdeploy.yml', 'utf-8'))

  const {
    stackSetName,
    templatePath = 'template.yml',
    s3Bucket,
    s3Key: s3Prefix = '',
    targets
  } = settings

  if (!stackSetName) {
    throw new Error('Need to provide stack set name')
  }

  if (!s3Bucket) {
    throw new Error('Need to provide S3 bucket name')
  }

  const sts = new AWS.STS({ apiVersion: '2011-06-15' })
  const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
  if (targets.default && !targets[defaultAccountId]) {
    targets[defaultAccountId] = targets.default
    delete targets.default
  }

  settings.templatePath = templatePath
  settings.s3Prefix = s3Prefix
  settings.targets = targets

  return settings
}

module.exports = {
  getSettings
}
