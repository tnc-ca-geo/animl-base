module.exports = {
  apps : [{
    name: 'animl-base',
    script: './src/app.js',
    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    // args: 'one two',
    instances: 1,
    autorestart: true,
    // watch: false,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    error_file: './logs/animl-base/err.log',
    out_file: './logs/animl-base/out.log',
    log_file: './logs/animl-base/combined.log',
  },
  {
    name: 'multibase-server-edition',
    script: 'mbasectl -s',
    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    // args: 'one two',
    instances: 1,
    autorestart: true,
    exp_backoff_restart_delay: 100,
    // watch: false,
    error_file: './logs/mbase/err.log',
    out_file: './logs/mbase/out.log',
    log_file: './logs/mbase/combined.log',
  }, 
],

  // deploy : {
  //   production : {
  //     user : 'node',
  //     host : '212.83.163.1',
  //     ref  : 'origin/master',
  //     repo : 'git@github.com:repo.git',
  //     path : '/var/www/production',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
  //   }
  // }
};
