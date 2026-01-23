/*
 * Manage disk space in order to ensure that field computers don't clog up
 * with too many files.
 *
 * NOTE: Directory size can go beyond the configured maximum between script
 * runs, configure accordingly.
 */
const { ArchiveStatus } = require('@aws-sdk/client-s3');
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
 * Summarize the combined size of files represented by path names in an array
 * @param {string[]} files
 * @returns {Number} sum of the disk space used by files
 */
async function addUpFileSizes( files ) {
  const stats = files.map(file => fs.stat( file ) );
  const directorySize = (
    await Promise.all( stats ))
    .reduce(
      ( accumulator, { size } ) => accumulator + size, 0
    );
  return directorySize / 1e9;
}

/**
 * Get over all size of a directory
 * @param {string} directory path name
 * @returns {Number} sum of the size of all files in the directory
 */
async function getDirectorySizeNew( directory ) {
  const files = await getAllFiles(directory);
  return addUpFileSizes( files );
}

/**
 * Delete file (randomly) if condition is met
 * @param {string} file
 * @param {Numver} percentageDelete
 * @returns {string, undefined} return file if still on the disk or undefined
 */
async function conditional_delete( file, percentageDelete ) {
  const randomNumber = Math.floor(Math.random() * 100) + 1;
  if (randomNumber > 100 - percentageDelete) {
    // console.log(`Delete ${file}`);
    await fs.unlink( file );
    return;
  } else {
    return file;
  }
};

/**
 * Recursively get all file paths within a directory and its subdirectories.
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
 * @returns {string[]} An array of all files still on the disk
 */
async function reduceFiles( files, percentage ) {
  let newFiles = [];
  const deletes = files.map( file => conditional_delete(file, percentage) );
  newFiles = await Promise.all( deletes );
  return newFiles.filter( item => item !== undefined );
};

/**
 * The start function tying everything together.
 */
async function start() {
  if (!['linux', 'darwin'].includes(process.platform)) {
    console.log('Disk management job not tested on non-Linux-like systems');
    return;
  }
  // Get metrics from file system and configuration
  const totalGB = await getSizeGB('/');
  const freeGB = await getFreeGB('/');
  const queueLimit = Number(config.queueLimit ?? freeGB/10).toFixed(2);
  const archiveLimit = Number(config.archiveLimit ?? freeGB/10).toFixed(2);
  let diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  let archiveFiles = await getAllFiles(config.archiveDir);
  let queueFiles = await getAllFiles(config.queueDir);
  let queueGB = await addUpFileSizes( queueFiles );
  let archiveGB = await addUpFileSizes( archiveFiles );
  // some useful output
  console.log(
    `${new Date().toLocaleString()}\n` +
    `Disk: ${diskPercentage}% of ${totalGB}GB full; ${freeGB}GB available\n` +
    `${queueLimit}GB allocated for image queue\n` +
    `${archiveLimit}GB allocated for image archive\n` +
    `Disk use limit ${config.diskLimit}%\n` +
    `Size of ${config.queueDir} is currently ${queueGB.toFixed(2)}GB ` +
    `(${queueFiles.length} images)\n` +
    `Size of ${config.archiveDir} is currently ${archiveGB.toFixed(2)}GB ` +
    `(${archiveFiles.length} images)`)
  // Check and reduce files
  // 1. Reduce archive, if archive size is reached
  while ( await addUpFileSizes( archiveFiles ) > archiveLimit ) {
    console.log(
      `Archive directory excededs threshold of ${archiveLimit}. ` +
      `Randomly delete about 20% of archived images.`)
    archiveFiles = await reduceFiles( archiveFiles, 20 );
  }
  // 2. Reduce queue, if queue max size is reached. If we arrive here that means
  // that the field computer has connectivity issues and cannot upload images to
  // the cloud.
  if ( await addUpFileSizes( queueFiles ) > queueLimit ) {
    console.log(
      `Queue directory exceeds threshold size of ${queueLimit}. ` +
      `Randomly delete about 20% of queue images.`)
    queueFiles = await reduceFiles( queueFiles, 20 );
  }
  // 3. Reduce archive until we are lower than the disk limit or have less than
  // one GB of images left in the archiveDir
  if ( diskPercentage > config.diskLimit && archiveGB > 1 ) {
    console.log(
      `Disk use threshold of ${config.diskLimit} exceeded. ` +
      `Randomly delete about 50% of archived images.`)
    await reduce_directory(config.archiveDir, 50);
    const freeGB = await getFreeGB('/');
    diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  }
  // 4. Reduce the queue if disk is still too full after deleting from
  // archiveDir. If arriving here we would be in a rather dire situation and
  // would prioritize keeping the system alive over retaining images
  if (diskPercentage > config.diskLimit ) {
    console.log(
      `Disk use threshold ${config.diskLimit} could not be cleard by ` +
      `deleting most of the archived images. Delete 20% of the queued ` +
      `images to keep the system running.\n` +
      `NOTE: At this point it is not guaranteed that all images will be ` +
      `uploaded to Animl, immediate attention is required!`)
    await reduce_directory(config.queueDir, 20);
    const freeGB = await getFreeGB('/');
    diskPercentage = Number((totalGB-freeGB)/totalGB * 100).toFixed(0);
  }
  console.log('DONE')
}

start();
