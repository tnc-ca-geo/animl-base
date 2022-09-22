const { spawn } = require('child_process');

class Multibase {
  constructor(config) {
    this.config = config;
  }

  exec(cmd, args) {
    return new Promise((resolve, reject) => {
      const output = { out: [], err: [] };
      const opts = { shell: true };
      const mbase = args ? spawn(cmd, args, opts) : spawn(cmd, opts);
      mbase.stdout.on('data', (data) => {
        console.log('mbase stdout: ', data.toString());
        output.out.push(data.toString());
      });
      mbase.stderr.on('data', (data) => {
        console.error('mbase stderr: ', data.toString());
        output.err.push(data.toString());
      });
      mbase.on('exit', (code) => {
        console.log(`mbase exited with code ${code}`);
        if (code === 0) {
          resolve(output);
        } else {
          // TODO: if we try to start multibase but it's already running, it exits
          // with code 1. We need to handle these rejections
          reject();
        }
      });
    });
  }

  async isRunning() {
    if (this.config.platform === 'linux') {
      const state = await this.exec('mbasectl', ['-i']);
      console.log('multibase state: ', state);
    }
  }

  async start() {
    if (this.config.platform === 'linux') {
      console.log('Linux detected, starting Buckeye Multibase SE');
      await this.isRunning();
      await this.exec('mbasectl', ['-s']);
    } else if (this.config.platform === 'win32') {
      console.log('Windows detected, starting Buckeye X-Manager');
      await this.exec('C:\\BuckEyeCam\\"X7D Base"\\xbase.exe');
    }
  }

  async stop() {
    // X-manager (the Windows version of the Buckeye network software)
    // does not have a CLI
    console.log('Stopping Multibase SE');
    if (this.config.platform === 'linux') {
      await this.isRunning();
      await this.exec('mbasectl', ['-k']);
      console.log('Multibase SE stopped');
    }
  }
}

module.exports = Multibase;
