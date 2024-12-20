const { spawn } = require('child_process');

class Multibase {
  constructor(config) {
    this.config = config;
  }

  exec(cmd, args) {
    return new Promise((resolve, reject) => {
      const output = { out: [], err: [], exitCode: null };
      const opts = { shell: true };
      const mbase = args ? spawn(cmd, args, opts) : spawn(cmd, opts);
      mbase.stdout.on('data', (data) => output.out.push(data.toString()));
      mbase.stderr.on('data', (data) => output.err.push(data.toString()));
      mbase.on('exit', (code) => {
        output.exitCode = code;
        resolve(output);
      });
    });
  }

  async isRunning() {
    if (this.config.platform === 'linux') {
      let running = true;
      const state = await this.exec('mbasectl', ['-i']);
      console.log('multibase state: ', state);
      for (const output of state.out) {
        if (output.includes('not running')) {
          running = false;
        }
      }
      return running;
    }
  }

  async start() {
    if (this.config.platform === 'linux') {
      console.log('Linux detected, checking Buckeye Multibase SE state...');
      const running = await this.isRunning();
      if (!running) {
        console.log('Starting Buckeye Multibase SE...');
        await this.exec('mbasectl', ['-s']);
      }
    } else if (this.config.platform === 'win32') {
      console.log('Windows detected, starting Buckeye X-Manager');
      await this.exec('C:\\BuckEyeCam\\"X7D Base"\\xbase.exe');
    }
  }

  async stop() {
    // X-manager (the Windows version of the Buckeye network software)
    // does not have a CLI
    if (this.config.platform === 'linux') {
      const running = await this.isRunning();
      if (running) {
        console.log('Stopping Multibase SE...');
        await this.exec('mbasectl', ['-k']);
        console.log('Multibase SE stopped');
      }
    }
  }
}

module.exports = Multibase;
