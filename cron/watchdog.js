/*
 * Connect to the IoT watchdog
 * Will fail if WATCHDOG_X_KEY is not provided in .env
 * Set WATCHDOG_LABEL for display name
 * Current fixed watchdog check-in is daily, please configure accordingly in
 * ecosystem.config.js
 */
const https = require('https');
const os = require('os');

/**
 * Send a POST query every day
 */
async function start() {
  const data = JSON.stringify({
    type: 'tnc',
    device_id: `animl-computer-${os.hostname()}`,
    label: 'test-machine',
  });
  const options = {
    host: 'api-dev.iotwatchdog.org',
    port: 443,
    path: '/hook/1500',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-api-key': '048lrowIBgaADabx539RFpHfQM25ECa9xqUO4Znc',
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
