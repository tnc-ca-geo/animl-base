const path = require('path');
const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const Multibase = require('./utils/multibase');
const MetricsLogger = require('./utils/metricsLogger');
const config = require('./config/index');

function shutDown(code, imgWatcher, metricsLogger, worker, mbase) {
  console.log(`\nExiting Animl Base with code ${code}`);
  mbase.stop();
  worker.stop();
  imgWatcher.close().then(() => console.log('Closed'));
  metricsLogger.stop();
}

function validateFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedFileTypes.includes(ext)) {
    console.log('Not a supported filetype: ', filePath);
    return false;
  }
  return true;
}

function handleNewFile(filePath, queue, metricsLogger) {
  console.log(`New file detected: ${filePath}`);
  if (validateFile(filePath)) {
    queue.add(filePath);
    metricsLogger.handleNewImage(filePath);
  }
}

async function start() {
  console.log('Starting Animl Base');

  // Starting Buckeye Multibase Server
  let mbase = new Multibase();
  mbase.start();

  // Initialize metrics logger
  let metricsLogger = new MetricsLogger(config);
  await metricsLogger.init();

  // Initialize queue
  let queue = new Queue(config);
  await queue.init();

  // Initialize directory watcher
  const imgWatcher = chokidar.watch(config.imgDir, config.watcher);
  imgWatcher
    .on('ready', () => console.log(`Watching for changes to ${config.imgDir}`))
    .on('add', (path) => handleNewFile(path, queue, metricsLogger))
    .on('error', (err) => console.log(`imgWatcher error: ${err}`));

  // Just for testing...
  const filesWatched = imgWatcher.getWatched();
  Object.keys(filesWatched).forEach((dir) => {
    console.log(`Number of files in ${dir} : ${filesWatched[dir].length}`);
  });

  // Initialize worker
  let worker = new Worker(config, queue, imgWatcher);
  await worker.init();
  worker.poll();

  // Clean up & shut down
  process.on('SIGTERM', (code) => {
    shutDown(code, imgWatcher, metricsLogger, worker, mbase);
  });
  process.on('SIGINT', (code) => {
    shutDown(code, imgWatcher, metricsLogger, worker, mbase);
  });
}

start();
