const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const Multibase = require('./utils/multibase');
const MetricsLogger = require('./utils/metricsLogger');
const config = require('./config/index');

async function shutDown(imgWatcher, metricsLogger, worker, mbase) {
  try {
    console.log(`Stopping Animl Base...`);
    worker.stop();
    await imgWatcher.close();
    console.log('imgWatcher stopped');
    metricsLogger.stop();
    if (config.platform === 'linux') {
      await mbase.stop();
    }
    process.exit(0);
  } catch (err) {
    console.log(`An error occurred while exiting`);
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

async function handleNewFile(filePath, queue, metricsLogger) {
  console.log(`New file detected: ${filePath}`);
  if (!validateFile(filePath)) return;
  try {
    // move file to queue directory
    const destPath = path.join(
      config.queueDir,
      filePath.split('/').slice(4).join('/')
    );
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    await fs.rename(filePath, destPath);
    console.log(`Moved file from ${source} to ${destPath}`);
    await metricsLogger.handleNewImage(destPath);
    queue.add(destPath);
  } catch (err) {
    console.log('Error handling new file: ', err);
  }
}

async function start() {
  console.log('---------------------------------\n');
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
  const imgWatcher = chokidar.watch(config.watchDir, config.watcher);
  imgWatcher
    .on('ready', async () => {
      console.log(`Watching for changes to ${config.watchDir}`);

      // NOTE: just for testing
      // const filesWatchedOnStart = imgWatcher.getWatched();
      // Object.keys(filesWatchedOnStart).forEach((dir) => {
      //   console.log(`Number of files in ${dir} ON START: ${filesWatchedOnStart[dir].length}`);
      //   console.log(`First image in directory: ${filesWatchedOnStart[dir][0]}`);
      // });
    })
    .on('add', (path) => handleNewFile(path, queue, metricsLogger))
    .on('error', (err) => console.log(`imgWatcher error: ${err}`));

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
