const dotenv = require('dotenv');
// config() will read your .env file, parse the contents, 
// assign it to process.env.
dotenv.config();

module.exports = {
  imgDir: process.env.IMG_DIR,
  aws: {
    bucket: process.env.DEST_BUCKET,
    region: process.env.REGION,
    accessKeyID: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
}