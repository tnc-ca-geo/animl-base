const { spawn } = require('child_process');

class Multibase {
  exec(args) {
    const mbase = spawn('mbasectl', args, { shell: true });
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
    this.exec(['-s']);
  }

  stop() {
    this.exec(['-k']);
  }
}

module.exports = Multibase;
