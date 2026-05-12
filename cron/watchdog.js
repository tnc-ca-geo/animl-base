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

  const subscriptions = config.watchdogSubscriptions.split(',');

  const data = JSON.stringify({
    type: 'tnc',
    device_id: `animl-computer-${os.hostname()}`,
    label: config.watchdogLabel,
    subscriptions: subscriptions,
  });
  const options = {
    host: 'api-dev.iotwatchdog.org',
    port: 443,
    path: '/hook/62',
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
