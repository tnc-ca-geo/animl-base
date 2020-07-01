const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const utils = require('./utils/utils');
const config = require('./config/index');

async function handleNewFile(filePath, queue) {
  console.log(`New file detected: ${filePath}`);
  if (utils.validateFile(filePath)) {
    queue.add(filePath);
  }
}

async function start() {
  console.log('Starting Animl Base');

  // Initialize queue
  let queue = new Queue(config);
  await queue.init();

  // Initialize watcher
  const watcher = chokidar.watch(config.imgDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    ignoreInitial: true, // ignore files in the directory on start
    persistent: true,
  });

  // Register listeners
  watcher
    .on('ready', () => console.log(`Watching for changes to ${config.imgDir}`))
    .on('add', (path) => handleNewFile(path, queue))
    .on('error', (error) => console.log(`Watcher error: ${error}`));

  // Clean up & shut down
  process.on('SIGTERM', (code) => utils.gracefulShutDown(code, watcher));
  process.on('SIGINT', (code) => utils.gracefulShutDown(code, watcher));
}

start();
