const path = require('path');
const chokidar = require('chokidar');
const Queue = require('./utils/queue');
const Worker = require('./utils/worker');
const { spawn } = require('child_process');
const config = require('./config/index');

function shutDown(code, watcher, worker) {
  console.log(`\nExiting Animl Base with code ${code}`);
  const mbase = spawn('mbasectl', '-k', { shell: true });
  mbase.stdout.on('data', (data) => {
    console.log('mbase stdout: ', data.toString());
  });

  mbase.stderr.on('data', (data) => {
    console.error('mbase stderr: ', data.toString());
  });

  mbase.on('exit', (code) => {
    console.log(`mbase exited with code ${code}`);
  });
  worker.stop();
  watcher.close().then(() => console.log('Closed'));
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
  const mbase = spawn('mbasectl', '-s', { shell: true });
  mbase.stdout.on('data', (data) => {
    console.log('mbase stdout: ', data.toString());
  });

  mbase.stderr.on('data', (data) => {
    console.error('mbase stderr: ', data.toString());
  });

  mbase.on('exit', (code) => {
    console.log(`mbase exited with code ${code}`);
  });


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
    shutDown(code, watcher, worker);
  });
  process.on('SIGINT', (code) => {
    shutDown(code, watcher, worker);
  });
}

start();
