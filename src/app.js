var config = require('./config/index');
const chokidar = require('chokidar');

console.log('Starting Animl Base. Watching directory: ', config.imgDir);

// Initialize watcher
const watcher = chokidar.watch(config.imgDir, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
});

// Add event listeners
watcher
  .on('ready', () => console.log('Initial scan complete. Ready for changes'))
  .on('add', path => console.log(`File ${path} has been added`))
  .on('error', error => console.log(`Watcher error: ${error}`));