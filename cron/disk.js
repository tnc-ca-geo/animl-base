/*
 * Manage disk space in order to ensure that field computers don't clog up
 * with too many files.
 *
 * NOTE: Directory size can go beyond the configured maximum between script
 * runs, configure accordingly.
 */
const config = require('./config/index');
const fs = require('fs/promises');
const path = require('path');

/**
 * Gets size of a (mounted) disk
 * @param {path} path: mounted path, in most cases '/'
 * @returns {Number}
 */
async function getSizeGB(path) {
  const stats = await fs.statfs(path);
  return (stats.blocks * stats.bsize / 1e9).toFixed(2);
}

/**
 * Gets free space on a (mounted) disk
 * @param {path} path: mounted path, in most cases '/'
 * @returns {Number}
 */
async function getFreeGB(path) {
  const stats = await fs.statfs(path);
  return (stats.bfree * stats.bsize / 1e9).toFixed(2);
}

/**
 * Gets directory size
 * @param {string} directory
 * @returns {Number}
 */
 async function getDirectorySize( directory ) {
  const files = await fs.readdir( directory );
  const stats = files.map(file => fs.stat( path.join( directory, file ) ) );
  const directorySize = (
    await Promise.all( stats ))
    .reduce(
      ( accumulator, { size } ) => accumulator + size, 0
    );
  return directorySize / 1e9;
}

/**
 * Delete file (randomly) if conditions are met
 * @param {string} file
 * @param {Numver} percentageDelete
 */
async function conditional_delete( file, percentageDelete ) {
  const randomNumber = Math.floor(Math.random() * 100) + 1;
  if (randomNumber > 100 - percentageDelete) {
    console.log(`Delete ${file}`);
    await fs.unlink( file );
  }
};

/**
 * Recursively gets all file paths within a directory and its subdirectories.
 * @param {string} dirPath The starting directory path.
 * @returns {string[]} An array of absolute file paths.
 */
async function getAllFiles(dirPath) {
  let files = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Remove files from the file system
 * @param {string} directory
 * @param {number} percentage
 */
async function reduce_directory( directory, percentage ) {
  // we are reading the files a second time here
  const files = await getAllFiles( directory );
  const deletes = files.map( file => conditional_delete(file, percentage) );
  await Promise.all( deletes );
};

/**
 * The start function tying everything together.
 */
async function start() {
  if (!['linux', 'darwin'].includes(process.platform)) {
    console.log('Disk management job not tested on non-Linux-like systems');
    return;
  }
  // get metrics from file system and configuration
  const totalGB = await getSizeGB('/');
  const freeGB = await getFreeGB('/');
  const queueLimit = Number(config.queueLimit ?? freeGB/10).toFixed(2);
  const archiveLimit = Number(config.archiveLimit ?? freeGB/10).toFixed(2);
  let diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  let queueGB = await getDirectorySize(config.queueDir);
  let archiveGB = await getDirectorySize(config.archiveDir);
  // some useful output
  console.log(
    `${new Date().toLocaleString()}\n` +
    `Disk: ${diskPercentage}% of ${totalGB}GB full; ${freeGB}GB available\n` +
    `${queueLimit}GB allocated for image queue\n` +
    `${archiveLimit}GB allocated for image archive\n` +
    `Disk use limit ${config.diskLimit}%\n` +
    `Size of ${config.queueDir} is currently ${queueGB.toFixed(2)}GB\n` +
    `Size of ${config.archiveDir} is currently ${archiveGB.toFixed(2)}GB`)

  // check and reduce files
  // 1. Reduce archive, if archive size is reached
  while (archiveGB > archiveLimit) {
    await reduce_directory(config.archiveDir, 20);
    archiveGB = await getDirectorySize(config.archiveDir);
  }
  // 2. Reduce queue, if queue max size is reached. If we arrive here that means
  // that the field computer has connectivity issues and cannot upload images to
  // the cloud.
  if (queueGB > queueLimit) {
    await reduce_directory(config.queueDir, 20);
    queueGB = await getDirectorySize(config.queueDir);
  }
  // 3. Reduce archive until we are lower than the disk limit or have less than
  // one GB of images left in the archiveDir
  if ( diskPercentage > config.diskLimit && archiveGB > 1 ) {
    await reduce_directory(config.archiveDir, 50);
    diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  }
  // 4. Reduce the queue if disk is still too full after deleting from
  // archiveDir. If arriving here we would be in a rather dire situation and
  // would prioritize keeping the system alive over retaining any images
  if (diskPercentage > config.diskLimit ) {
    await reduce_directory(config.queueDir, 20);
    diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  }
console.log('DONE')
}

start();
