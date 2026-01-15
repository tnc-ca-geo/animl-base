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
  queueLimit: process.env.QUEUE_LIMIT_GB,
  archiveLimit: process.env.ARCHIVE_LIMIT_GB,
  diskLimit: process.env.DISK_LIMIT_PERCENT,
  watchdogApiEndPoint: 'api-dev.iotwatchdog.org',
  watchdogXApiKey: process.env.WATCHDOG_X_API_KEY,
  watchdogSubscriptions: process.env.WATCHDOG_SUBSCRIPTIONS,
  watchdogLabel: process.env.WATCHDOG_LABEL
};
