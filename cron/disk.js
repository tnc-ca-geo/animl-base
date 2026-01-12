/*
 * Manage disk space in order to ensure that field computers don't get glogged
 * up with old files.
 */
import config from './config/index';


async function start() {
    // I am not sure whether a process.exit() makes sense on an async function,
    // however we call it synchronously anyways. TODO: remove async?
    if (process.platform != 'linux') {
        console.log('Cron job not tested on non-Linux systems')
        process.exit(1)
    }
    print(config.queueDir)
}

start()