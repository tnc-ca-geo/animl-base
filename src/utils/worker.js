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

      // move file from queue directory to archive directory
      console.log('Moving file to archive directory');
      const destPath = img.path.replace('queue', 'archive');
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(img.path, destPath);

      // Just for testing...
      const filesWatched = this.imgWatcher.getWatched();
      Object.keys(filesWatched).forEach((dir) => {
        console.log(
          `Number of files being watched in ${dir} : ${filesWatched[dir].length}`
        );
      });

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
    if (this.timer) {
      clearTimeout(this.timer);
    }
    console.log('Worker stopped');
  }
}

module.exports = Worker;
