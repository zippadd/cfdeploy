const { getSettings } = require('./getSettings.js')
const { deployStackSet } = require('./stackSet/deployStackSet.js')
const commander = require('commander')

const cfdeploy = async () => {
  const program = new commander.Command()
  program
    .option('-f, --file <filePath>', 'path to cfdeploy file')
    .allowUnknownOption(true)

  program.parse(process.argv)
  const filePath = program.file ? program.file.trim() : 'cfdeploy.yml'

  const deployments = await getSettings(filePath)
  const deploymentPromises = []

  for (const deployment of deployments) {
    if (deployment.type === 'stackSet') {
      deploymentPromises.push(deployStackSet(deployment))
    }
  }

  await Promise.all(deploymentPromises)
}

cfdeploy()
  .then(() => {
    console.log('All deployments have completed.')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })

module.exports = { cfdeploy }
