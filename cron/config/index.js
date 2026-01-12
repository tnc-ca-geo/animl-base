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
};
