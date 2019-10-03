const { deployStackSet } = require('./stackSet/deployStackSet.js')
const commander = require('commander')
const program = new commander.Command()
program
  .option('-f, --file <filePath>', 'path to cfdeploy file')

program.parse(process.argv)
const filePath = program.file ? program.file.trim() : ''

deployStackSet(filePath)
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
