'use strict';

/*
 * Connect to the IoT watchdog
 * Will fail if WATCHDOG_X_KEY is not provided in .env
 * Set WATCHDOG_LABEL for display name
 * Current fixed watchdog check-in is daily, please configure accordingly in
 * ecosystem.config.js
 */
const https = require('https');
const os = require('os');
const config = require('./config/index');

/**
 * Send a POST query every day
 */
async function start() {
  if (!config.watchdogEnabled) {
    return;
  }

  // check for required env variables
  if (!config.watchdogXApiKey) {
    console.log('Error: WATCHDOG_X_API_KEY is not set in .env. Exiting.');
    return;
  }

  if (!config.watchdogLabel) {
    console.log('Error: WATCHDOG_LABEL is not set in .env. Exiting.');
    return;
  }

  if (!config.watchdogSubscriptions) {
    console.log('Error: WATCHDOG_SUBSCRIPTIONS is not set in .env. Exiting.');
    return;
  }

  if (config.watchdogSubscriptions.includes(' ')) {
    console.log(
      'Error: WATCHDOG_SUBSCRIPTIONS should not contain spaces. Exiting.'
    );
    return;
  }

  const subscriptions = config.watchdogSubscriptions.split(',');

  const data = JSON.stringify({
    type: 'tnc',
    device_id: `animl-computer-${os.hostname()}`,
    label: config.watchdogLabel,
    subscriptions: subscriptions,
  });
  const options = {
    host: config.watchdogApiEndPoint,
    port: 443,
    path: '/hook/1500', // if the device does not report every 1500 minutes (25 hours) it will be marked as offline
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-api-key': config.watchdogXApiKey,
    },
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Response:', data);
    });
  });
  req.on('error', (err) => {
    console.log('Error: ', err.message);
  });
  req.write(data);
  req.end();
}

start();
