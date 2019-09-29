const AWS = require('aws-sdk')
const yaml = require('js-yaml')
const fs = require('fs-extra')

const getSettings = async (filePath = 'cfdeploy.yml') => {
  const file = await fs.readFile(filePath, 'utf-8')
  let yamlDoc
  try {
    yamlDoc = yaml.safeLoad(file)
  } catch (err) {
    if (err.message.includes('duplicated mapping key')) {
      throw new Error('Duplicate account ids specified in targets')
    }
    throw new Error('Error parsing the config file YAML')
  }

  const { settings } = yamlDoc
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

  const duplicateTargetsError = new Error('Duplicate account ids specified in targets')

  const sts = new AWS.STS({ apiVersion: '2011-06-15' })
  const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
  if (targets.default) {
    if (targets[defaultAccountId]) {
      throw duplicateTargetsError
    }
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
