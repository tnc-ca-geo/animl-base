const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Tail = require('tail').Tail;
const AWS = require('aws-sdk');
var exif = require('exiftool');

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
      const idField = fields.find((field) => field.includes('CAMERAID'));
      const idFieldValue = idField.split('=')[1];
      const camera = idFieldValue.split(',')[0];
      console.log('camera: ', camera);
      let re = new RegExp(/\d+/);
      const camNumber = camera.match(re)[0];
      console.log('camNumber: ', camNumber);
      return camNumber;
    } catch (e) {
      console.log('Error parsing metadata for cam number: ', e);
    }
  }

  parsePicCountEvent(data) {
    console.log('parsig pic counter event: ', data);
    let re = new RegExp(/\d+/);
    const event = data.split(':EVENT:');
    const timestamp = moment(event[0], 'YYYY/MM/DD hh:mm:ss').unix();
    const msg = event[1].split(',');
    const camNumber = msg[0].match(re);
    const picCount = msg[1].match(re);
    return { timestamp, camNumber, picCount };
  }

  async handlePicCounterEvent(data) {
    // Parse event
    const event = this.parsePicCountEvent(data);
    console.log(`timestamp: ${event.timestamp}`);
    console.log(`camera: ${event.camNumber}`);
    console.log(`count: ${event.picCount}`);

    try {
      // publish to cloudwatch metrics
      var params = {
        MetricData: [
          {
            MetricName: 'PicCount', // rename PicCountOnCamera
            Dimensions: [
              {
                Name: 'base',
                Value: this.baseId,
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
    console.log('Extracting Exif data...');
    const metadata = await this.getExif(filePath);
    console.log('metadata: ', metadata);
    const camNumber = this.getCamNumber(metadata.comment);
    // TODO: caclulate latency (lag between when image was taken and now)
    console.log('date/time Original: ', metadata['date/timeOriginal']);
    const dto = moment(metadata['date/timeOriginal'], 'YYYY:MM:DD hh:mm:ss');
    console.log('dto: ', dto);
    const now = moment();
    const latency = now.diff(dto, 'seconds');
    console.log('latency: ', latency);
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
