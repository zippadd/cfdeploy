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

const deployStackSet = async (deployment) => {
  const { name, type, templatePath, s3Bucket, s3Prefix, targets } = deployment

  if (type !== 'stackSet') {
    throw new Error('Requested deploying a StackSet, but type is not stackSet')
  }

  const { url: templateURL } = await artifactUpload(templatePath, s3Bucket, s3Prefix)

  /* Update/create Stack Set */
  await createOrUpdateStackSet(name, templateURL)

  /* Check and make stack set instance adjustments if needed */
  await adjustInstances(name, targets)

  console.log(`${name} deployment has completed.`)
}

module.exports = { deployStackSet }
