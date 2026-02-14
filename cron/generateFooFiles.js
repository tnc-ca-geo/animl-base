/*
 * A script that generates files in a certain (depending on CRON settings)
 * frequency. Used to test disk.js
 * NOTE: DISABLE IN PRODUCTION
 */
const config = require('./config/index');
const fs = require('fs');

example_image = '/home/animl/test1.jpg'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {
  let index = 0;
  while (1) {
    const randomNumber = Math.floor(Math.random() * 100000000) - 1;
    const indexStr = String(randomNumber).padStart(8, '0')
    const newFileName = `${config.archiveDir}/camera_1/test_${indexStr}.jpg`
    try {
      await fs.promises.copyFile(example_image, newFileName);
      console.log(`Storing ${example_image} into ${newFileName}`)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        console.log(
          `File ${example_image} does not exist; please create for this test.`)
      } else {
        console.error(`Error copying file: ${err.message}`)
      }
    }
    index += 1;
    await delay(10);
  }
}

start();