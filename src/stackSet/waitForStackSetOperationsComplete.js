const AWS = require('aws-sdk')

const waitForStackSetOperationsComplete = async (stackSetName, operationIds) => {
  const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15' })
  const opIds = new Set(operationIds)
  let nextToken

  while (opIds.size > 0) {
    let stackInstanceOpIdsToReview = opIds.size

    do {
      const listStackSetOperationsParams = {
        StackSetName: stackSetName,
        ...(nextToken && { NextToken: nextToken })
      }
      const { Summaries: summaries, NextToken } = await cloudformation.listStackSetOperations(listStackSetOperationsParams).promise()
      nextToken = NextToken

      for (const summary of summaries) {
        const { OperationId: operationId, Status: status } = summary
        if (opIds.has(operationId)) {
          switch (status) {
            case 'FAILED':
            case 'STOPPED':
            case 'STOPPING':
              throw new Error('Stack update failed or was cancelled. Review stack set events to determine cause.')

            case 'SUCCEEDED':
              opIds.delete(operationId)
              break

            case 'RUNNING':
              break

            default:
              throw new Error('Unrecognized StackSet Operation!')
          }
          stackInstanceOpIdsToReview--
        }

        if (stackInstanceOpIdsToReview <= 0) {
          nextToken = false
          break
        }
      }
    } while (nextToken)

    await new Promise((resolve) => {
      setTimeout(resolve, 5 * 1000)
    })
  }
}

module.exports = {
  waitForStackSetOperationsComplete
}
