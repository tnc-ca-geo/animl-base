'use strict';

/*
 * Generates foo files in a certain frequency by copying an existing on to
 * random file names into the archive directory. Used to test disk.js.
 */
const config = require('../config/index');
const fs = require('fs');

const example_image = '/home/animl/test1.jpg';

/**
 * Delays execution for ms miliseconds.
 * @param {Number} ms
 * @returns Promise
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The main function.
 */
async function start() {
  let index = 0;
  while (1) {
    const randomNumber = Math.floor(Math.random() * 100000000) - 1;
    const indexStr = String(randomNumber).padStart(8, '0');
    const newFileName = `${config.archiveDir}/camera_1/test_${indexStr}.jpg`;
    try {
      await fs.promises.copyFile(example_image, newFileName);
      console.log(`Storing ${example_image} into ${newFileName}`);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        console.log(
          `File ${example_image} does not exist; please create for this test.`
        );
      } else {
        console.error(`Error copying file: ${err.message}`);
      }
    }
    index += 1;
    await delay(1000);
  }
}

/**
 * Run it!
 */
start();
