const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const utils = require('./utils/utils');
const config = require('./config/index');

function handleNewFile(filePath, queue) {
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

  // Initialize directory watcher
  const watcher = chokidar.watch(config.imgDir, config.watcher);
  watcher
    .on('ready', () => console.log(`Watching for changes to ${config.imgDir}`))
    .on('add', (path) => handleNewFile(path, queue))
    .on('error', (err) => console.log(`Watcher error: ${err}`));

  // Initialize worker
  let worker = new Worker(config, queue);
  await worker.init();
  worker.poll();

  // Clean up & shut down
  process.on('SIGTERM', (code) => {
    utils.gracefulShutDown(code, watcher, worker);
  });
  process.on('SIGINT', (code) => {
    utils.gracefulShutDown(code, watcher, worker);
  });
}

start();
