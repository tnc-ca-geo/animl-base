module.exports = {
  apps: [
    {
      name: 'animl-base',
      script: './src/app.js',
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      // args: 'one two',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
      error_file: 'err.log',
      out_file: 'out.log',
      log_file: 'combined.log',
      time: true,
    },
    {
      name: 'multibase-server-edition',
      // script: 'mbasectl -s',
      script: '/usr/local/mbse/mbasectl',
      args: '-s',
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      instances: 1,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      // watch: true,
    },
  ],
};
