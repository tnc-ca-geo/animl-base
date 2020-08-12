module.exports = {
  apps: [
    {
      name: 'animl-base',
      script: './src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
      time: true,
    },
    {
      name: 'temperature-logger',
      script: 'python temp-monitor.py',
      instances: 1,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      interpreter: '/usr/bin/python',
      watch: false,
    },
  ],
};
