const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Tail = require('tail').Tail;
const AWS = require('aws-sdk');
var exif = require('exiftool');

class MetricsLogger {
  constructor(config) {
    this.config = config;
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
        fs.readFile(filePath, function (err, data) {
          if (err) {
            throw err;
          } else {
            exif.metadata(data, function (err, metadata) {
              if (err) {
                throw err;
              } else {
                resolve(metadata);
              }
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getCamNumber(comment) {
    try {
      const fields = comment.split('.');
      const nodeNumField = fields.find((field) => field.includes('NODE'));
      const nodeNum = nodeNumField.split('=')[1];
      return nodeNum;
    } catch (e) {
      console.log('Error parsing metadata for cam number: ', e);
    }
  }

  parsePicCountEvent(data) {
    try {
      let re = new RegExp(/\d+/);
      const event = data.split(':EVENT:');
      const timestamp = moment(event[0], 'YYYY/MM/DD hh:mm:ss').unix();
      const msg = event[1].split(',');
      const camNumber = msg[0].match(re);
      const picCount = msg[1].match(re);
      return { timestamp, camNumber, picCount };
    } catch (e) {
      console.log('Error parsing pic count event from mbase logs: ', e);
    }
  }

  async handlePicCounterEvent(data) {
    // Parse event
    const event = this.parsePicCountEvent(data);

    try {
      // publish to cloudwatch metrics
      var params = {
        MetricData: [
          {
            MetricName: 'PicCountOnCamera',
            Dimensions: [
              {
                Name: 'base',
                Value: this.config.baseName,
              },
              {
                Name: 'camera',
                Value: 'camera ' + event.camNumber,
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
    // extract metadata
    const metadata = await this.getExif(filePath);
    const camNumber = this.getCamNumber(metadata.comment);

    // caclulate latency (lag between when image was taken and now)
    const dto = moment(metadata['date/timeOriginal'], 'YYYY:MM:DD hh:mm:ss');
    const now = moment();
    const latency = now.diff(dto, 'seconds');

    try {
      // publish to cloudwatch metrics
      var params = {
        MetricData: [
          {
            MetricName: 'PicLatency',
            Dimensions: [
              {
                Name: 'base',
                Value: this.config.baseName,
              },
              {
                Name: 'camera',
                Value: 'camera ' + camNumber,
              },
            ],
            Timestamp: now.unix(),
            Unit: 'Seconds',
            Value: latency,
          },
        ],
        Namespace: 'Animl',
      };
      return await this.cloudwatch.putMetricData(params).promise();
    } catch (e) {
      console.log('Error pushing pic counter metric to cloudwatch: ', e);
    }
  }

  stop() {
    console.log('Stopping metricsLogger');
    if (this.tail) {
      this.tail.unwatch();
    }
    console.log('metricsLogger stopped');
  }
}

module.exports = MetricsLogger;
