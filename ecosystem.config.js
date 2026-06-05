// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'tdgames-preview',
      script: 'npm',
      args: 'start',
      cwd: '/opt/tdgames-preview',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
