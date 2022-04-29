const dotenv = require('dotenv');
// config() will read your .env file, parse the contents,
// assign it to process.env.
dotenv.config();

module.exports = {
  os: process.platform,
  baseName: process.env.BASE_NAME,
  imgDir: process.env.IMG_DIR,
  dbFile: 'db.json',
  logFile: process.env.LOG_FILE,
  aws: {
    bucket: process.env.DEST_BUCKET,
    region: process.env.AWS_REGION,
  },
  watcher: {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    ignoreInitial: true, // ignore files in the directory on start
    persistent: true,
  },
  supportedFileTypes: ['.jpg', '.png'],
  pollInterval: 5000,
  backoff: {
    base: 3000, // initial timeout
    max: 60000, // maximum timeout
  },
};
