const path = require('path');

module.exports = {
  apps: [
    {
      name: 'parking-api',
      cwd: path.resolve(__dirname),
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 2,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      listen_timeout: 8000,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'staging',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
