const { getSettings } = require('./utilities/getSettings.js')
const { deployStackSet } = require('./stackSet/deployStackSet.js')
const commander = require('commander')
const allSettled = require('promise.allsettled')
allSettled.shim()

const cfdeploy = async () => {
  const program = new commander.Command()
  program
    .option('-f, --file <filePath>', 'path to cfdeploy file')
    .option('-d, --direct', 'skip artifact processing and directly use base template body vs uploading to S3')
    .option('-e, --environment <environmentName>', 'specifies an environment string to pass as a deployment parameter')
    .allowUnknownOption(true)

  program.parse(process.argv)
  const filePath = program.file ? program.file.trim() : 'cfdeploy.yml'
  const opts = program.opts()

  console.log('Retrieving deployments and settings...')
  const rawDeployments = await getSettings(filePath)
  const deployments = rawDeployments.filter((deployment) => {
    return deployment.type === 'stackSet'
  })
  const deploymentPromises = []

  console.log('Starting deployments...')
  for (let deploymentNum = 0; deploymentNum < deployments.length; deploymentNum++) {
    const deployment = deployments[deploymentNum]
    console.log(`Launching deployment ${deploymentNum + 1} of ${deployments.length}: ${deployment.name}`)
    deploymentPromises.push(deployStackSet(deployment, opts)
      .then(() => {
        console.log(`${deployment.name}: deployment finished`)
      })
      .catch((err) => {
        console.log(`${deployment.name}: deployment failed per below error`)
        console.log(err)
        throw err
      }))
  }

  return Promise.allSettled(deploymentPromises)
}

cfdeploy()
  .then((results) => {
    let successCount = 0
    let failCount = 0

    for (const result of results) {
      result.status === 'fulfilled' ? successCount++ : failCount++
    }

    if (failCount <= 0) {
      console.log(`All ${successCount} deployments have completed successfully.`)
    } else {
      console.log(`Failures occured in the deployments. Successful deployments: ${successCount}. Failed deployments: ${failCount}`)
      process.exitCode = 1
    }
  })
  .catch((err) => {
    console.log('A deployment process error occurred.')
    console.log(err)
    process.exitCode = 1
  })

module.exports = { cfdeploy }
