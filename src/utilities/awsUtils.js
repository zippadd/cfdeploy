const AWS = require('aws-sdk')

const getAWSCurrentAccountId = async () => {
  const sts = new AWS.STS({ apiVersion: '2011-06-15' })
  const { Account } = await sts.getCallerIdentity({}).promise()
  return Account
}

const getAWSCurrentOrDefaultRegion = () => {
  return AWS.config.region ? AWS.config.region : 'us-east-1'
}

module.exports = {
  getAWSCurrentAccountId,
  getAWSCurrentOrDefaultRegion
}
