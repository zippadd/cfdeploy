const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const archiver = require('archiver')

const archiveFormats = { zip: 'zip' }

const archiveFilePath = async (filePath, format = archiveFormats.zip) => {
  if (format !== archiveFormats.zip) {
    throw new Error('Invalid archive format')
  }

  const isDir = (await fs.stat(filePath)).isDirectory()
  const { dir } = path.parse(filePath)

  try {
    await fs.mkdir(path.join(os.tmpdir(), dir), { recursive: true })
  } catch (err) {
    if (!err.message.includes('EEXIST')) {
      throw err
    }
  }

  return new Promise((resolve, reject) => {
    const tmpFilePath = path.join(os.tmpdir(), `${filePath}.zip`)
    const output = fs.createWriteStream(tmpFilePath)
    const archive = archiver(format)

    // This event is fired for when the file is written / fd is closed
    output.on('close', () => {
      resolve(tmpFilePath)
    })

    // Handle any warnings as they arise if possible and reject if cannot handle
    archive.on('warning', (err) => {
      reject(err)
    })

    // Handle any errors as they arise if possible and reject if cannot handle
    archive.on('error', (err) => {
      reject(err)
    })

    // Set up the piping of data to output stream
    archive.pipe(output)

    if (isDir) {
      archive.directory(filePath, false)
    } else {
      archive.file(filePath)
    }

    archive.finalize()
  }).catch((err) => {
    throw err
  })
}

module.exports = {
  archiveFilePath, archiveFormats
}
