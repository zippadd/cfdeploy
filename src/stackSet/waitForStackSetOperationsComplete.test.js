/* eslint-env jest */
const uuidv4 = require('uuid/v4')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

const stackSetName = 'test-stacksets'
const getPsuedoRandBetween = (minNum, maxNum) => {
  return Math.floor(Math.random() * (maxNum - minNum) - minNum)
}

const SUMMARIES_PAGE_NUM_MAX = 2
const stockSummaries = (() => {
  const summariesPages = []
  for (let pageNum = 0; pageNum < SUMMARIES_PAGE_NUM_MAX; pageNum++) {
    summariesPages.push({
      Summaries: [],
      NextToken: (pageNum + 1) < SUMMARIES_PAGE_NUM_MAX ? `${pageNum + 1}` : null
    })
    for (let summaryNum = 0; summaryNum < getPsuedoRandBetween(5, 10); summaryNum++) {
      const summary = {
        OperationId: uuidv4(),
        Status: summaryNum % 2 === 0 ? 'SUCCEEDED' : 'FAILED'
      }
      summariesPages[pageNum].Summaries.push(summary)
    }
  }
  return summariesPages
})()

const getPagedSummaries = (summariesPages, nextToken) => {
  if (!nextToken) {
    return summariesPages[0]
  }
  return summariesPages[parseInt(nextToken, 10)]
}

describe('Wait for Stack Set Ops to Complete', () => {
  const { waitForStackSetOperationsComplete } = require('./deployStackSet.js')
  test('Returns thrown error when an unknown stack op status is returned', () => {
    const badOperationId = uuidv4()
    const stockSummariesCopy = stockSummaries.slice(0)
    stockSummariesCopy[stockSummaries.length - 1].Summaries.push({
      OperationId: badOperationId,
      Status: 'UNKNOWN'
    })
    const badSummaries = jest.fn((params, callback) => {
      return callback(null, getPagedSummaries(stockSummariesCopy, params.NextToken))
    })
    AWS.mock('CloudFormation', 'listStackSetOperations', badSummaries)
    expect.assertions(1)
    const result = expect(waitForStackSetOperationsComplete(stackSetName, [badOperationId])).rejects.toThrow()
    AWS.restore('CloudFormation', 'listStackSetOperations')
    return result
  })
  test('Returns when the stack ops complete', async () => {
    jest.setTimeout(30000)
    const operationId = uuidv4()
    const operationId2 = uuidv4()
    let simulateFinish = false
    const stockSummariesCopy = stockSummaries.slice(0)
    stockSummariesCopy[0].Summaries.push({
      OperationId: operationId2,
      Status: 'SUCCEEDED'
    })
    stockSummariesCopy[stockSummaries.length - 1].Summaries.push({
      OperationId: operationId,
      get Status () {
        return simulateFinish ? 'SUCCEEDED' : 'RUNNING'
      }
    })
    const summaries = jest.fn((params, callback) => {
      const summariesPage = getPagedSummaries(stockSummariesCopy, params.NextToken)
      if (!summariesPage.NextToken) {
        simulateFinish = true
      }
      return callback(null, summariesPage)
    })
    AWS.mock('CloudFormation', 'listStackSetOperations', summaries)
    expect.assertions(1)
    const result = await expect(waitForStackSetOperationsComplete(stackSetName, [operationId, operationId2])).resolves.toEqual()
    AWS.restore('CloudFormation', 'listStackSetOperations')
    return result
  })
})
