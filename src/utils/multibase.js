const { spawn } = require('child_process');

class Multibase {
  constructor(config) {
    this.config = config;
  }

  exec(cmd, args) {
    const opts = { shell: true };
    const mbase = args ? spawn(cmd, args, opts) : spawn(cmd, opts);
    mbase.stdout.on('data', (data) => {
      console.log('mbase stdout: ', data.toString());
    });
    mbase.stderr.on('data', (data) => {
      console.error('mbase stderr: ', data.toString());
    });
    mbase.on('exit', (code) => {
      console.log(`mbase exited with code ${code}`);
    });
  }

  start() {
    if (this.config.os === 'linux') {
      console.log('Linux detected, starting Buckeye Multibase SE')
      this.exec('mbasectl', ['-s']);
    }
    else if (this.config.os === 'windows') {
      console.log('Windows detected, starting Buckeye X-Manager')
      this.exec('C:\\BuckEyeCam\\"X7D Base"\\xbase.exe');
    }
  }

  stop() {
    // X-manager (the Windows version of the Buckeye network software)
    // does not have a CLI
    if (this.config.os === 'linux') {
      this.exec('mbasectl', ['-k']);
    }
  }
}

module.exports = Multibase;
