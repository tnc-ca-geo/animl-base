const dotenv = require('dotenv');
// config() will read your .env file, parse the contents, 
// assign it to process.env.
dotenv.config();

module.exports = {
  imgDir: process.env.IMG_DIR,
  aws: {
    accessKeyID: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
}