// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'tdgames-preview',
      script: 'npm',
      args: 'start',
      cwd: '/opt/tdgames-preview',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 5000,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
