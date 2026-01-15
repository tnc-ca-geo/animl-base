/*
 * A script that generates files in a certain (depending on CRON settings)
 * frequency. Used to test disk.js
 * NOTE: DISABLE IN PRODUCTION
 */
const config = require('./config/index');
const fs = require('fs');

example_image = '/home/animl/test.jpg'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {
  let index = 0;
  while (1) {
    const indexStr = String(index).padStart(7, '0')
    const newFileName = `${config.archiveDir}/test_${indexStr}.jpg`
    fs.copyFile(example_image, newFileName, (err) => {
      if (err && err.code === 'ENOENT') {
        console.log(
          `File ${example_image} does not exist; please create for this test.`)
        return;
      };
      console.log(`Storing ${example_image} into ${newFileName}`)
    } )
    index += 1;
    await delay(10);
  }
}

start();