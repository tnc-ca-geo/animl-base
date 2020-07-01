const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const Backoff = require('backo');
const S3Service = require('./s3Service');

class Queue {
  constructor(config) {
    this.dbFile = config.dbFile;
    this.awsConfig = config.aws;
    this.backoff = new Backoff({
      min: config.backoff.base,
      max: config.backoff.max,
    });
    this.processing = false;
  }

  async init() {
    // aws
    this.s3 = new S3Service(this.awsConfig);
    this.s3.init();

    // db
    const adapter = new FileAsync(this.dbFile);
    this.db = await low(adapter);
    this.db._.mixin({ first: (array) => array[0] });
    await this.db.defaults({ imgQueue: [] }).write();
    this.size = await this.db.get('imgQueue').size().value();

    // Process any backlogged images
    this.processJobs();
  }

  async add(filePath) {
    try {
      console.log('Adding file to queue');
      await this.db.get('imgQueue').push({ path: filePath }).write();
      this.size = await this.db.get('imgQueue').size().value();
      console.log('New queue size: ', this.size);
      if (this.size === 1) {
        this.processJobs();
      }
    } catch (err) {
      console.log(`Error adding ${filePath} to queue: `, err);
    }
  }

  async processJobs() {
    if (this.size === 0) {
      console.log('Queue is empty');
      return;
    }

    try {
      console.log('Trying to upload first image in the queue...');
      const img = this.db.get('imgQueue').first().value();
      const response = await this.s3.upload(img.path);
      await this.db.get('imgQueue').remove({ path: img.path }).write();
      this.size = await this.db.get('imgQueue').size().value();
      console.log('Upload success: ', response);

      // just for testing
      const dbState = await this.db.getState();
      console.log('db state after successful upload: ', dbState);
      // end test

      this.backoff.reset();
      this.processJobs();
    } catch (err) {
      console.log('Error processing job: ', err);
      // just for testing
      const dbState = await this.db.getState();
      console.log('db state after failed upload: ', dbState);
      // end test

      console.log('Backing off then retrying...');
      setTimeout(() => {
        this.processJobs();
      }, this.backoff.duration());
    }
  }
}

module.exports = Queue;
