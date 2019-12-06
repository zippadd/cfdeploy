/* eslint-env jest */
const EventEmitter = require('events')
const crypto = require('crypto')

const blake2Support = crypto.getHashes().includes('blake2s256')

describe('Hash File', () => {
  beforeEach(() => {
    jest.resetModules()
  })
  const dummyFile = './dummyFile/48963117947_395e4891de_w.jpg'
  test('Returns the proper hash for a given file', () => {
    const { hashFile } = require('./hashFile.js')
    expect.assertions(1)
    const hash = blake2Support
      ? '147312e02f184babb3bf3bf1e4af9db1ef264f778233aa9750ead498e163a1f4'
      : '49d9935632d7a304b48491b78a8a86a6ba9831fb7eb9df58fa283a545cdedbe0'
    return expect(hashFile(dummyFile)).resolves.toEqual(hash)
  })
  test('Throws an error if no preferred hashes are available', () => {
    expect.assertions(1)
    jest.doMock('crypto', () => {
      return {
        getHashes: () => { return [] }
      }
    })
    const { hashFile } = require('./hashFile.js')
    return expect(hashFile(dummyFile)).rejects.toThrow()
  })
  test('Throws an error if an error occurs in the read stream', () => {
    expect.assertions(1)
    const errMsg = 'Fake FS error'
    jest.doMock('crypto', () => {
      return {
        getHashes: () => { return ['blake2s256'] },
        createHash: () => {
          return {
            setEncoding: () => {},
            on: () => {}
          }
        }
      }
    })
    jest.doMock('fs-extra', () => {
      return {
        createReadStream: () => {
          const emitter = new EventEmitter()
          return {
            on: (event, func) => { emitter.on(event, func) },
            pipe: () => { emitter.emit('error', new Error(errMsg)) }
          }
        }
      }
    })
    const { hashFile } = require('./hashFile.js')
    return expect(hashFile(dummyFile)).rejects.toThrow(errMsg)
  })
})
