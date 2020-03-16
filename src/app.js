var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');
const chokidar = require('chokidar');
const config = require('./config/index');

console.log('Starting Animl Base. Watching directory: ', config.imgDir);

// Connect to AWS
AWS.config.update({region: config.aws.region});
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

// Handle new images
const handleNewFile = (filePath) => {
  console.log('Uploading file: ', filePath);
  
  var uploadParams = {Bucket: config.aws.bucket, Key: '', Body: ''};
  var fileStream = fs.createReadStream(filePath);
  fileStream.on('error', function(err) {
    console.log('File Error', err);
  });
  uploadParams.Body = fileStream;
  uploadParams.Key = path.basename(filePath);

  s3.upload (uploadParams, function (err, data) {
    if (err) {
      console.log("Error", err);
    } if (data) {
      console.log("Upload Success", data.Location);
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
  .on('add', filePath => handleNewFile(filePath))
  .on('error', error => console.log(`Watcher error: ${error}`));

// Clean up & shut down
const gracefulShutDown = function () {
  console.log('\nshutting down Animl Base')
  watcher.close().then(() => console.log('closed'));
};

process.on('SIGTERM', gracefulShutDown);
process.on('SIGINT', gracefulShutDown)