const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

class S3Service {
  constructor(config) {
    this.config = config;
  }

  init() {
    this.s3 = new S3Client({ maxRetries: 0, ...this.config });
  }

  async upload(filePath) {
    try {
      console.log('Uploading file: ' + filePath + ' to ' + this.config.bucket);
      const fileName = path.basename(filePath);
      let fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => console.log('File stream error: ', err));

      // NOTE: we MUST set content type when uploading to S3. See:
      // https://github.com/tnc-ca-geo/animl-api/issues/65
      return await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Body: fileStream,
          Key: fileName,
          ContentType: 'image/jpeg',
        })
      );
    } catch (e) {
      console.log('Error uploading image: ', e);
    }
  }
}

module.exports = S3Service;
