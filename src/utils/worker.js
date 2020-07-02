const Backoff = require('backo');
const S3Service = require('./s3Service');

class Worker {
  constructor(config, queue) {
    this.queue = queue;
    this.awsConfig = config.aws;
    this.pollInterval = config.pollInterval;
    this.backoff = new Backoff({
      min: config.backoff.base,
      max: config.backoff.max,
    });
  }

  async init() {
    this.s3 = new S3Service(this.awsConfig);
    this.s3.init();
  }

  async poll() {
    console.log('Queue length: ', this.queue.size);
    if (this.queue.size === 0) {
      this.timer = setTimeout(() => {
        this.poll();
      }, this.pollInterval);
      return;
    }

    try {
      // get first job & process
      const img = await this.queue.getFirst();
      await this.s3.upload(img.path);
      await this.queue.remove(img.path);
      console.log('Upload success');

      // Reset backoff and poll again
      this.backoff.reset();
      this.poll();
    } catch (err) {
      // Increment backoff duration and poll again
      console.log('Error processing job: ', err);
      console.log('Backing off then retrying...');
      this.timer = setTimeout(() => {
        this.poll();
      }, this.backoff.duration());
    }
  }

  stop() {
    console.log('Stopping worker');
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

module.exports = Worker;
