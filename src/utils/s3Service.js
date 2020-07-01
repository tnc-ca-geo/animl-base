const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const utils = require('./utils');

class S3Service {
  constructor(config) {
    this.config = config;
  }

  init() {
    // AWS.config.logger = console;
    AWS.config.update({ region: this.config.region });
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01', maxRetries: 0 });
  }

  async upload(filePath) {
    try {
      console.log('Uploading file: ' + filePath + ' to ' + this.config.bucket);
      const ext = path.extname(filePath);
      const hash = await utils.createHash(filePath, __dirname);
      let uploadParams = { Bucket: this.config.bucket };
      let fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => console.log('File stream error: ', err));
      uploadParams.Body = fileStream;
      uploadParams.Key = hash + ext;
      return this.s3.upload(uploadParams).promise();
    } catch (e) {
      console.log('Error uploading image: ', e);
    }
  }
}

module.exports = S3Service;
