const path = require('path');
const moment = require('moment');
const Tail = require('tail').Tail;
const AWS = require('aws-sdk');
const ExifImage = require('exif').ExifImage;

class MetricsLogger {
  constructor(config) {
    this.config = config;
    this.baseId = path.basename(path.dirname(config.logFile));
  }

  async init() {
    // initialize tailing of mbase log file
    AWS.config.logger = console;
    AWS.config.update({ region: this.config.region });
    this.cloudwatch = new AWS.CloudWatch({ apiVersion: '2010-08-01' });
    try {
      this.tail = new Tail(this.config.logFile);
      this.tail.on('line', async (data) => {
        if (data.includes('pics counter')) {
          await this.handlePicCounterEvent(data);
        }
      });
    } catch (e) {
      console.log('Error watching multibase log file: ', e);
    }
  }

  getExif(filePath) {
    return new Promise(function (resolve, reject) {
      try {
        new ExifImage({ image: filePath }, function (error, exifData) {
          if (error) {
            reject(error);
          } else {
            resolve(exifData);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  parsePicCountEvent(data) {
    console.log('parsig pic counter event: ', data);
    let re = new RegExp(/\d+/);
    const event = data.split(':EVENT:');
    const timestamp = moment(event[0], 'YYYY/MM/DD hh:mm:ss').unix();
    const msg = event[1].split(',');
    const camera = msg[0].match(re);
    const picCount = msg[1].match(re);
    return { timestamp, camera, picCount };
  }

  async handlePicCounterEvent(data) {
    // Parse event
    const event = this.parsePicCountEvent(data);
    console.log(`timestamp: ${event.timestamp}`);
    console.log(`camera: ${event.camera}`);
    console.log(`count: ${event.picCount}`);

    try {
      // publish to cloudwatch metrics
      var params = {
        MetricData: [
          {
            MetricName: 'PicCount',
            Dimensions: [
              {
                Name: 'base',
                Value: this.baseId,
              },
              {
                Name: 'camera',
                Value: 'camera ' + event.camera,
              },
            ],
            Timestamp: event.timestamp,
            Unit: 'Count',
            Value: Number(event.picCount),
          },
        ],
        Namespace: 'Animl',
      };
      return await this.cloudwatch.putMetricData(params).promise();
    } catch (e) {
      console.log('Error pushing pic counter metric to cloudwatch: ', e);
    }
  }

  async handleNewImage(filePath) {
    console.log('Extracting Exif data...');
    const exif = await this.getExif(filePath);
    console.log('exif: ', exif);
    // TODO: caclulate time between DateTimeOriginal and now
    // TODO: publish to Cloudwatch 
  }

  stop() {
    console.log('Stopping metricsLogger');
    if (this.tail) {
      this.tail.unwatch();
    }
  }
}

module.exports = MetricsLogger;
