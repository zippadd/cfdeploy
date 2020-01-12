const AWS = require('aws-sdk')
const { artifactUpload } = require('./artifactUpload.js')
const { createOrUpdateStackSet } = require('./createOrUpdateStackSet.js')
const { adjustInstances } = require('./adjustInstances.js')

/*
  Ensure a default region is set as AWS SDK requires it
  Assume us-east-1 as that is the AWS default (https://docs.aws.amazon.com/general/latest/gr/rande.html)
*/
const defaultRegion = 'us-east-1'
if (!AWS.config.region) {
  AWS.config.update({ region: defaultRegion })
}

const deployStackSet = async (deployment, opts) => {
  const {
    type,
    templatePath,
    adminS3Bucket,
    adminS3Prefix,
    targetsS3BucketBase,
    targetsS3Prefix,
    targets
  } = deployment
  let { name } = deployment
  const {
    direct,
    environment
  } = opts

  if (type !== 'stackSet') {
    throw new Error('Requested deploying a StackSet, but type is not stackSet')
  }

  let templateURL

  if (direct) {
    templateURL = templatePath
  } else {
    const { url } = await artifactUpload(templatePath, adminS3Bucket, adminS3Prefix, targetsS3BucketBase, targetsS3Prefix, targets, environment)
    templateURL = url
  }

  const parameters = []

  if (environment) {
    name = `${name}-${environment}`
    parameters.push({
      ParameterKey: 'Environment',
      ParameterValue: environment,
      UsePreviousValue: false
    })
  }

  /* Update/create Stack Set */
  await createOrUpdateStackSet(name, templateURL, parameters)

  /* Check and make stack set instance adjustments if needed */
  await adjustInstances(name, targets)
}

module.exports = { deployStackSet }
