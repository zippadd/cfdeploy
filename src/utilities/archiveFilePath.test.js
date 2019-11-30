/* eslint-env jest */
const EventEmitter = require('events')
const os = require('os')
const path = require('path')

const dummyDirBase = 'dummyFile'
const dummyDir = `./${dummyDirBase}`
const dummyFile = `${dummyDir}/48963117947_395e4891de_w.jpg`

describe('Archive File', () => {
  beforeEach(() => {
    jest.resetModules()
  })
  test('Returns the proper path to the archived file', () => {
    const { archiveFilePath } = require('./archiveFilePath.js')
    expect.assertions(1)
    return expect(archiveFilePath(dummyFile)).resolves.toEqual(path.join(os.tmpdir(), `${dummyFile}.zip`))
  })
  test('Returns the proper path to the archived directory', () => {
    const { archiveFilePath } = require('./archiveFilePath.js')
    expect.assertions(1)
    return expect(archiveFilePath(dummyDir)).resolves.toEqual(path.join(os.tmpdir(), `${dummyDirBase}.zip`))
  })
})
describe('Archive Errors', () => {
  const errMsg = 'fake error'
  const warnMsg = 'fake warning'
  beforeEach(() => {
    jest.resetModules()
    jest.doMock('archiver', () => {
      return () => {
        const emitter = new EventEmitter()
        return {
          on: (event, func) => { emitter.on(event, func) },
          pipe: () => {},
          directory: () => { emitter.emit('error', new Error(errMsg)) },
          file: () => { emitter.emit('warning', new Error(warnMsg)) },
          finalize: () => {}
        }
      }
    })
  })
  test('Gets an error when hitting an error event', () => {
    const { archiveFilePath } = require('./archiveFilePath.js')
    expect.assertions(1)
    return expect(archiveFilePath(dummyDir)).rejects.toThrow(errMsg)
  })
  test('Gets an error when hitting an warning event', () => {
    const { archiveFilePath } = require('./archiveFilePath.js')
    expect.assertions(1)
    return expect(archiveFilePath(dummyFile)).rejects.toThrow(warnMsg)
  })
  test('Throws an error when specifying an invalid format', () => {
    const { archiveFilePath } = require('./archiveFilePath.js')
    expect.assertions(1)
    return expect(archiveFilePath(dummyFile, '7zip')).rejects.toThrow()
  })
})
