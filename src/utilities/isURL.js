const { URL } = require('url')

const isS3URL = (urlOrPath) => {
  return urlOrPath.match(/^s3:\/\/.*/)
}

const isURL = (urlOrPath) => {
  try {
    const url = new URL(urlOrPath)
    url.toString() // Include to silence warning and make sure not null
  } catch (err) {
    return false
  }

  return true
}

module.exports = {
  isURL, isS3URL
}
