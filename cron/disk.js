/**
 * Manage disk space in order to ensure that field computers don't clog up
 * with too many files.
 *
 * NOTE: Disk usage can go beyond the configured maximum between script
 * runs, configure some head room accordingly.
 */
const config = require('./config/index');
const fs = require('fs').promises;
const path = require('path');

/**
 * Gets size of a (mounted) disk. The concept of mounted disk is important
 * because all disk size operations are related to the disk on which the
 * requested directory resides.
 * @param {str} mountPath: mounted path, in most cases '/'
 * @returns {Number}
 */
async function getSizeGB(mountPath) {
  const stats = await fs.statfs(mountPath);
  return ((stats.blocks * stats.bsize) / 1e9).toFixed(2);
}

/**
 * Gets free space on a (mounted) disk
 * @param {path} mountPath: mounted path, in most cases '/'
 * @returns {Number}
 */
async function getFreeGB(mountPath) {
  const stats = await fs.statfs(mountPath);
  return ((stats.bfree * stats.bsize) / 1e9).toFixed(2);
}

/**
 * Get disk percentage
 * Note: This might break if there are mounted disks in the tree.
 * @param {str} mountPath: Path were disk is mounted, default '/'
 * @returns {Number}
 *
 */
async function getDiskPercentage(mountPath = '/') {
  const totalGB = await getSizeGB(mountPath);
  const freeGB = await getFreeGB(mountPath);
  const percentage = Number(((totalGB - freeGB) / totalGB) * 100).toFixed(1);
  console.log(
    `Disk: ${percentage}% of ${totalGB}GB full; ${freeGB}GB available`
  );
  return percentage;
}

/**
 * Delete file (randomly) if condition is met
 * @param {string} fileq
 * @param {Number} percentageDelete
 * @returns {string, undefined} return file if still on the disk or undefined
 */
async function conditionalDelete(file, percentageDelete) {
  const randomNumber = Math.floor(Math.random() * 100) + 1;
  if (randomNumber > 100 - percentageDelete) {
    console.log(`Deleted ${file}`);
    await fs.unlink(file);
    return;
  } else {
    return file;
  }
}

/**
 * Iterate over the files in the directory without loading a long list into
 * memory. This is slow but will only take very few resources compared to
 * the prior version. Returns actual size of the directory.
 * @param {string} dirPath
 * @param {boolean} del
 * @returns Number
 */
async function processFiles(dirPath, del = false) {
  let directorySize = 0;
  const dir = await fs.opendir(dirPath);
  for await (const dirent of dir) {
    if (dirent.isFile()) {
      const filePath = path.join(dirPath, dirent.name);
      let res = filePath;
      if (del) {
        res = await conditionalDelete(filePath, 10);
      }
      // add up remaining disk use
      if (res) {
        const fileStat = await fs.stat(filePath);
        directorySize += fileStat.size;
      }
    } else {
      directorySize += await processFiles(
        path.join(dirPath, dirent.name),
        (del = del)
      );
    }
  }
  return directorySize;
}

/**
 * Reduce a directory in attempt to meet disk percentage, will abort if target
 * directory is below 1GB.
 * @param { string } directory: The target directory
 * @param { string } mountPath: The mount path '\' unless you have more than one
 *  disk mounted
 * @param { Number } limitPercentage
 */
async function reduceDirectory(directory, mountPath, limitPercentage) {
  let diskPercent = await getDiskPercentage((mountPath = config.diskMountPath));
  if (diskPercent < config.diskLimit) {
    console.log(
      `More than ${100 - config.diskLimit}% of disk space left. Exiting.\n`
    );
    return;
  }
  let dirSize = await processFiles(directory, (del = false));
  console.log(`Size of ${directory} is ${dirSize / 1e9} GB`);
  let reduced = false;
  while (diskPercent > limitPercentage && Number(dirSize) > 1e9) {
    dirSize = await processFiles(directory, (del = true));
    diskPercent = await getDiskPercentage((mountPath = mountPath));
    reduced = true;
  }
  if (!reduced) {
    console.log(`Size of ${config.archiveDir} cannot be further reduced.`);
  } else {
    console.log(
      `Size of ${directory} is ` +
        `${Number(dirSize / 1e9).toFixed(2)} GB after reduction.`
    );
  }
}

async function start() {
  // Implement Windows and test as needed
  if (!['linux', 'darwin'].includes(process.platform)) {
    console.log('Disk management job not tested on non-Linux-like systems');
    return;
  }

  // Some useful output
  console.log(
    '\nDisk space supervisor' +
      '\n---------------------\n' +
      `${new Date().toLocaleString()}\n\n` +
      `Disk use limit ${config.diskLimit}%`
  );

  // 1. Try to reach disk usage goal by reducing the archive directory.
  await reduceDirectory(
    config.archiveDir,
    config.diskMountPath,
    config.diskLimit
  );

  // 2. Try to reach the disk usage goal by reducing the queue directory, if enabled.
  // Note: This should be an extremely rare undesireable condition.
  if (config.deleteQueueForDisk) {
    await reduceDirectory(
      config.queueDir,
      config.diskMountPath,
      config.diskLimit
    );
  }
}

/**
 * Run it!
 */
start();
