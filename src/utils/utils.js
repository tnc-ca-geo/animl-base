const fs = require('fs');
const md5 = require('md5');

function createHash(filePath) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, function(err, buf) {
      !err ? resolve(md5(buf)) : reject(err);
    });
  });
};

function gracefulShutDown () {
  console.log('\nShutting down Animl Base...')
  watcher.close().then(() => console.log('Closed'));
};

module.exports = {
  createHash,
  gracefulShutDown,
}