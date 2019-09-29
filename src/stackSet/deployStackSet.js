const AWS = require('aws-sdk')
const { getSettings } = require('./getSettings.js')
const { uploadTemplate } = require('./uploadTemplate.js')
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

const deployStackSet = async () => {
  const { stackSetName, templatePath, s3Bucket, s3Key, targets } = await getSettings()

  const templateURL = await uploadTemplate(templatePath, s3Bucket, s3Key)

  /* Update/create Stack Set */
  await createOrUpdateStackSet(stackSetName, templateURL)

  /* Check and make stack set instance adjustments if needed */
  await adjustInstances(stackSetName, targets)
}

module.exports = { deployStackSet }
