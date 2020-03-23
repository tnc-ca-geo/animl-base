const fs = require('fs');
const config = require('./config/index');
const AWS = require('aws-sdk');
const path = require('path');
const chokidar = require('chokidar');
const utils = require('./utils/utils');

console.log('Starting Animl Base. Watching directory: ', config.imgDir);

// Connect to AWS
AWS.config.update({ region: config.aws.region });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

// Handle new images
async function uploadNewFile(filePath) {

  const ext = path.extname(filePath);
  if (!config.supportedFileTypes.includes(ext)) {
    console.log('Not a supported filetype');
    return;
  }

  console.log('Uploading file: ' + filePath + ' to ' + config.aws.bucket);

  const hash = await utils.createHash(filePath, __dirname);
  let uploadParams = { Bucket: config.aws.bucket };
  let fileStream = fs.createReadStream(filePath);
  fileStream.on('error', err => console.log('File Error', err));
  uploadParams.Body = fileStream;
  uploadParams.Key = hash + ext;

  s3.upload(uploadParams, (err, data) => {
    if (err) {
      console.log('Error', err);
    } if (data) {
      console.log('Upload Success', data);
    }
  });
  
};

// Initialize watcher
const watcher = chokidar.watch(config.imgDir, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  ignoreInitial: true, // ignore files in the directory on start
  persistent: true,
});

// Add event listeners
watcher
  .on('ready', () => console.log('Initial scan complete. Ready for changes'))
  .on('add', filePath => uploadNewFile(filePath))
  .on('error', error => console.log(`Watcher error: ${error}`));

// Clean up & shut down
process.on('SIGTERM', utils.gracefulShutDown);
process.on('SIGINT', utils.gracefulShutDown)