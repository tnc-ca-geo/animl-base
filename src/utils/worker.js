const Backoff = require('backo');
const S3Service = require('./s3Service');

class Worker {
  constructor(config, queue, imgWatcher) {
    this.queue = queue;
    this.awsConfig = config.aws;
    this.imgWatcher = imgWatcher;
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
    if (this.queue.size === 0) {
      this.timer = setTimeout(() => {
        this.poll();
      }, this.pollInterval);
      return;
    }

    try {
      // get first job & process
      console.log('Queue length: ', this.queue.size);
      const img = await this.queue.getFirst();
      await this.s3.upload(img.path);
      console.log('Upload success');
      await this.queue.remove(img.path);
      await this.imgWatcher.unwatch(img.path); // TODO: test whether this works

      // // Just for testing...
      // const filesWatched = this.imgWatcher.getWatched();
      // Object.keys(filesWatched).forEach((dir) => {
      //   console.log(`Number of files in ${dir} : ${filesWatched[dir].length}`);
      // });

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
