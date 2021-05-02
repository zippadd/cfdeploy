const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')
const { getAWSCurrentAccountId } = require('./awsUtils.js')

const getSettings = async (filePath = 'cfdeploy.yml') => {
  const absFilePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  const file = await fs.readFile(absFilePath, 'utf-8')
  let yamlDoc
  try {
    yamlDoc = yaml.load(file)
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
      adminS3Bucket,
      adminS3Prefix = '',
      targetsS3BucketBase,
      targetsS3Prefix = '',
      targets
    } = deployment

    if (type !== 'stackSet') {
      throw new Error('Invalid deployment type in one of the deployments')
    }

    if (!name) {
      throw new Error('Name is missing from one of the deployments')
    }

    if (!adminS3Bucket) {
      throw new Error('Admin S3 bucket name is missing from one of the deployments')
    }

    if (!targetsS3BucketBase) {
      throw new Error('Targets S3 bucket base is missing from one of the deployments')
    }

    const duplicateTargetsError = new Error('Duplicate account ids specified in targets for one of the deployments')

    const defaultAccountId = await getAWSCurrentAccountId()
    if (targets.default) {
      if (targets[defaultAccountId]) {
        throw duplicateTargetsError
      }
      targets[defaultAccountId] = targets.default
      delete targets.default
    }

    deployment.templatePath = path.join(path.dirname(absFilePath), templatePath)
    deployment.adminS3Bucket = adminS3Bucket
    deployment.adminS3Prefix = adminS3Prefix
    deployment.targetsS3BucketBase = targetsS3BucketBase
    deployment.targetsS3Prefix = targetsS3Prefix
    deployment.targets = targets
  }

  return deployments
}

module.exports = {
  getSettings
}
