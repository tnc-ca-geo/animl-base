const path = require('path');
const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const Multibase = require('./utils/multibase');
const MetricsLogger = require('./utils/metricsLogger');
const config = require('./config/index');

async function shutDown(imgWatcher, metricsLogger, worker, mbase) {
  try {
    console.log(`Exiting Animl Base`);
    if (config.platform === 'linux') {
      await mbase.stop();
    }
    worker.stop();
    await imgWatcher.close();
    console.log('imgWatcher stopped');
    metricsLogger.stop();
    process.exit(0);
  } catch (err) {
    console.log(`An error occured while exiting`);
    process.exit(1);
  }
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

  // Starting Buckeye software
  let mbase = new Multibase(config);
  await mbase.start();

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

  // // Just for testing...
  // const filesWatched = imgWatcher.getWatched();
  // Object.keys(filesWatched).forEach((dir) => {
  //   console.log(`Number of files in ${dir} : ${filesWatched[dir].length}`);
  // });

  // Initialize worker
  let worker = new Worker(config, queue, imgWatcher);
  await worker.init();
  worker.poll();

  // Clean up & shut down
  process.on('SIGTERM', () => {
    shutDown(imgWatcher, metricsLogger, worker, mbase);
  });
  process.on('SIGINT', () => {
    shutDown(imgWatcher, metricsLogger, worker, mbase);
  });
  // Windows graceful shutdown
  // NOTE: experiencing bug when console.logging here:
  // https://github.com/Unitech/pm2/issues/4925
  process.on('message', (msg) => {
    if (msg == 'shutdown') {
      shutDown(imgWatcher, metricsLogger, worker, mbase);
    }
  });
}

start();
