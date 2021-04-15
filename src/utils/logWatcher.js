const moment = require('moment');
const Tail = require('tail').Tail;
const AWS = require('aws-sdk');

class S3Service {
  constructor(config) {
    this.config = config;
  }

  async init() {
    AWS.config.logger = console;
    AWS.config.update({ region: this.config.region });
    console.log('initializeing cloudwatch');
    this.cloudwatch = new AWS.CloudWatch({ apiVersion: '2010-08-01' });
    try {
      console.log('watching log file: ', this.config.logFile);
      this.tail = new Tail(this.config.logFile);
      this.tail.on('line', async (data) => {
        console.log('new line on log watcher: ', data);
        if (data.includes('pics counter')) {
          await this.handlePicCounterEvent(data);
        }
      });
    } catch (e) {
      console.log('Error watching multibase log file: ', e);
    }
  }

  parsePicCountEvent(data) {
    console.log('parsig pic counter event: ', data);
    let re = new RegExp(/\d+/);
    const event = data.split(':EVENT:');
    const timestamp = moment(event[0], 'YYYY/MM/DD hh:mm:ss');
    const msg = event[1].split(',');
    const camera = msg[0].match(re);
    const picCount = msg[1].match(re);
    return { timestamp, camera, picCount }
  }

  async handlePicCounterEvent(data) {
    // Parse event
    const event = this.parsePicCountEvent(data);
    console.log(`timestamp: ${event.timestamp}`);
    console.log(`camera: ${event.camera}`);
    console.log(`count: ${event.picCount}`);

    try {
      // Push to cloudwatch metrics
      var params = {
        MetricData: [
          {
            MetricName: 'PicCount',
            Dimensions: [
              {
                Name: 'camera',
                Value: event.camera,
              },
            ],
            // StorageResolution: '5',
            Timestamp: event.timestamp,
            Unit: 'Count',
            Value: event.picCount,
          },
        ],
        Namespace: 'Animl',
      };
      return await cloudwatch.putMetricData(params).promise();
    } catch (e) {
      console.log('Error pushing pic counter metric to cloudwatch: ', e)
    }
  }

  stop() {
    console.log('Stopping logWatcher');
    if (this.tail) {
      this.tail.unwatch();
    }
  }
}

module.exports = S3Service;
