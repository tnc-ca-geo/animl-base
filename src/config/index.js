const dotenv = require('dotenv');
// config() will read your .env file, parse the contents,
// assign it to process.env.
dotenv.config();

module.exports = {
  imgDir: process.env.IMG_DIR,
  dbFile: 'db.json',
  aws: {
    bucket: process.env.DEST_BUCKET,
  },
  supportedFileTypes: ['.jpg', '.png'],
  backoff: {
    base: 3000, // initial timeout
    max: 60000, // maximum timeout
  },
};
