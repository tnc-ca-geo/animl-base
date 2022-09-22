const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

class S3Service {
  constructor(config) {
    this.config = config;
  }

  init() {
    AWS.config.logger = console;
    AWS.config.update({ region: this.config.region });
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01', maxRetries: 0 });
  }

  async upload(filePath) {
    try {
      console.log('Uploading file: ' + filePath + ' to ' + this.config.bucket);
      const fileName = path.basename(filePath);
      let fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => console.log('File stream error: ', err));

      // NOTE: we MUST set content type when uploading to S3. See:
      // https://github.com/tnc-ca-geo/animl-api/issues/65
      let params = {
        Bucket: this.config.bucket,
        Body: fileStream,
        Key: fileName,
        ContentType: 'image/jpeg',
      };

      return this.s3.upload(params).promise();
    } catch (e) {
      console.log('Error uploading image: ', e);
    }
  }
}

module.exports = S3Service;
