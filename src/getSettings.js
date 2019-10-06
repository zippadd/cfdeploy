const AWS = require('aws-sdk')
const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')

const getSettings = async (filePath = 'cfdeploy.yml') => {
  const absFilePath = path.join(process.cwd(), filePath)
  const file = await fs.readFile(absFilePath, 'utf-8')
  let yamlDoc
  try {
    yamlDoc = yaml.safeLoad(file)
  } catch (err) {
    if (err.message.includes('duplicated mapping key')) {
      throw new Error('Duplicate account ids specified in targets')
    }
    throw new Error('Error parsing the config file YAML')
  }

  const { deployments } = yamlDoc

  for (const deployment of deployments) {
    const {
      type,
      name,
      templatePath = 'template.yml',
      s3Bucket,
      s3Key: s3Prefix = '',
      targets
    } = deployment

    if (type !== 'stackSet') {
      throw new Error('Invalid deployment type in one of the deployments')
    }

    if (!name) {
      throw new Error('Name is missing from one of the deployments')
    }

    if (!s3Bucket) {
      throw new Error('S3 bucket name is missing from one of the deployments')
    }

    const duplicateTargetsError = new Error('Duplicate account ids specified in targets for one of the deployments')

    const sts = new AWS.STS({ apiVersion: '2011-06-15' })
    const { Account: defaultAccountId } = await sts.getCallerIdentity({}).promise()
    if (targets.default) {
      if (targets[defaultAccountId]) {
        throw duplicateTargetsError
      }
      targets[defaultAccountId] = targets.default
      delete targets.default
    }

    deployment.templatePath = path.join(path.dirname(absFilePath), templatePath)
    deployment.s3Prefix = s3Prefix
    deployment.targets = targets
  }

  return deployments
}

module.exports = {
  getSettings
}
