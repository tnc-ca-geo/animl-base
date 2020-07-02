const fs = require('fs');
const path = require('path');
const md5 = require('md5');
const config = require('../config/index');

function validateFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedFileTypes.includes(ext)) {
    console.log('Not a supported filetype: ', filePath);
    return false;
  }
  return true;
}

function createHash(filePath) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, (err, buf) => {
      !err ? resolve(md5(buf)) : reject(err);
    });
  });
}

function gracefulShutDown(code, watcher, worker) {
  console.log(`\nExiting Animl Base with code ${code}`);
  worker.stop();
  watcher.close().then(() => console.log('Closed'));
}

module.exports = {
  validateFile,
  createHash,
  gracefulShutDown,
};
