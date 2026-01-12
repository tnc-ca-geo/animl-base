/*
 * Manage disk space in order to ensure that field computers don't get glogged
 * up with old files.
 */
const config = require('./config/index');

async function start() {
  if (!['linux', 'darwin'].includes(process.platform)) {
    console.log('Cron job not tested on non-Linux-like systems');
    // I am not sure whether a process.exit() makes sense on an async function,
    // however we call it synchronously anyways. TODO: remove async?
    process.exit(1);
  }
  console.log(config);
}

start();
