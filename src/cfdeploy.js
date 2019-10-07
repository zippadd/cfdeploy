const { getSettings } = require('./getSettings.js')
const { deployStackSet } = require('./stackSet/deployStackSet.js')
const commander = require('commander')

const main = async () => {
  const program = new commander.Command()
  program
    .option('-f, --file <filePath>', 'path to cfdeploy file')

  program.parse(process.argv)
  const filePath = program.file ? program.file.trim() : ''

  const deployments = await getSettings(filePath)
  const deploymentPromises = []

  for (const deployment of deployments) {
    if (deployment.type === 'stackSet') {
      deploymentPromises.push(deployStackSet(deployment))
    }
  }

  await Promise.all(deploymentPromises)
}

main()
  .then(() => {
    console.log('All deployments have completed.')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
