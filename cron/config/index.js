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
  diskLimit: Number(process.env.DISK_LIMIT_PERCENT) || 60,
  diskMountPath: process.env.DISK_MOUNT_PATH || '/',
  // env variables are always strings and they must be evaluated as such
  deleteQueueForDisk: process.env.DELETE_QUEUE_FOR_DISK == 'true',
  watchDir: process.env.WATCH_DIR,
  watchdogEnabled: process.env.WATCHDOG_ENABLED == 'true',
  // watchdogApiEndPoint: 'api-dev.iotwatchdog.org', // dev endpoint
  watchdogApiEndPoint: 'api.iotwatchdog.org', // prod endpoint
  watchdogXApiKey: process.env.WATCHDOG_X_API_KEY,
  watchdogSubscriptions: process.env.WATCHDOG_SUBSCRIPTIONS,
  watchdogLabel: process.env.WATCHDOG_LABEL,
};
