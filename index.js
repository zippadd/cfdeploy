const { deployStackSet } = require('./src/deployStackSet.js')

deployStackSet()
  .then(() => {
    console.log('Done!')
  })
  .catch((err) => {
    console.log(err)
    process.exitCode = 1
  })
