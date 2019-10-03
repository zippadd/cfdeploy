const { deployStackSet } = require('./src/index.js')
const commander = require('commander')
const program = new commander.Command()

program.parse(process.argv)

console.log('done')

/*
deployStackSet()
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
*/
