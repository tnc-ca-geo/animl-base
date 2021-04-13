const path = require('path');
const chokidar = require('chokidar');
const moment = require('moment');
const Tail = require('tail').Tail;
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const Multibase = require('./utils/multibase');
const config = require('./config/index');

function shutDown(code, imgWatcher, logWatcher, worker, mbase) {
  console.log(`\nExiting Animl Base with code ${code}`);
  mbase.stop();
  worker.stop();
  imgWatcher.close().then(() => console.log('Closed'));
  logWatcher.unwatch();
}

function validateFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.supportedFileTypes.includes(ext)) {
    console.log('Not a supported filetype: ', filePath);
    return false;
  }
  return true;
}

function handleNewFile(filePath, queue) {
  console.log(`New file detected: ${filePath}`);
  if (validateFile(filePath)) {
    queue.add(filePath);
  }
}

async function start() {
  console.log('Starting Animl Base');

  // Starting Buckeye Multibase Server
  let mbase = new Multibase();
  mbase.start();

  // Initialize queue
  let queue = new Queue(config);
  await queue.init();

  // Initialize directory watcher
  const imgWatcher = chokidar.watch(config.imgDir, config.watcher);
  imgWatcher
    .on('ready', () => console.log(`Watching for changes to ${config.imgDir}`))
    .on('add', (path) => handleNewFile(path, queue))
    .on('error', (err) => console.log(`imgWatcher error: ${err}`));

  // Initialize worker
  let worker = new Worker(config, queue);
  await worker.init();
  worker.poll();

  // Initialize log watcher
  try {
    let logWatcher = new Tail(config.logFile);
    logWatcher.on('line', (data) => {
      console.log('new line on log watcher: ', data);
      if (data.includes('pics counter')) {

        // Parse pics counter event
        console.log('parsig pics counter event: ', data);
        let re = new RegExp(/\d+/);
        const event = data.split(':EVENT:');
        const timestamp = moment(event[0]);
        const msg = event[1].split(',');
        const camera = msg[0].match(re);
        const counter = msg[1].match(re);

        console.log(`timestamp: ${timestamp}`);
        console.log(`camera: ${camera}`);
        console.log(`count: ${counter}`);
        
        // TODO: push to cloudwatch metrics
      }
    });
  } catch (err) {
    console.log(`logWatcher error: ${err}`);
  }

  // Clean up & shut down
  process.on('SIGTERM', (code) => {
    shutDown(code, imgWatcher, logWatcher, worker, mbase);
  });
  process.on('SIGINT', (code) => {
    shutDown(code, imgWatcher, logWatcher, worker, mbase);
  });
}

start();
