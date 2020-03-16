var config = require('./config/index');
const chokidar = require('chokidar');

// Initialize watcher
const watcher = chokidar.watch(config.imgDir, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,

});

// Add event listeners
watcher
  .on('ready', () => log('Initial scan complete. Ready for changes'))
  .on('add', path => log(`File ${path} has been added`))
  .on('error', error => log(`Watcher error: ${error}`));