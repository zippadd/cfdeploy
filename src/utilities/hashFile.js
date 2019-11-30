const crypto = require('crypto')
const fs = require('fs-extra')

const getHashAlgo = () => {
  const preferredHashes = [
    'blake2s256',
    'sha3-256',
    'sha256'
  ]

  const availableHashes = crypto.getHashes()

  for (const hash of preferredHashes) {
    if (availableHashes.includes(hash)) {
      return hash
    }
  }

  throw new Error('No preferred hashes are available')
}

const hashFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath)
    const hash = crypto.createHash(getHashAlgo())
    hash.setEncoding('hex')

    input.on('error', (err) => {
      reject(err)
    })
    hash.on('finish', () => {
      resolve(hash.read())
    })

    input.pipe(hash)
  })
}

module.exports = {
  hashFile
}
