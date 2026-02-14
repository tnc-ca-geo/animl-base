/*
 * Read values from .env. This is somewhat a duplicate of /src/config/index.js
 * but I try to keep the concerns separated for now since we running the disk
 * management on its on process.
 */
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  queueDir: process.env.QUEUE_DIR,
  archiveDir: process.env.ARCHIVE_DIR,
  diskLimit: process.env.DISK_LIMIT_PERCENT || 60,
  diskMountPath: process.env.DISK_MOUNTING_PATH || '/',
  deleteQueueForDisk: process.env.DELETE_QUEUE_FOR_DISK || false,
  // for testing and foo image generation
  watchDir: process.env.WATCH_DIR,
  watchdogApiEndPoint: 'api-dev.iotwatchdog.org',
  // for production
  // watchdogApiEndPoint: 'api.iotwatchdog.org',
  watchdogXApiKey: process.env.WATCHDOG_X_API_KEY,
  watchdogSubscriptions: process.env.WATCHDOG_SUBSCRIPTIONS,
  watchdogLabel: process.env.WATCHDOG_LABEL
};
