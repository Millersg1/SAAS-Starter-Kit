module.exports = {
  apps: [
    {
      name: 'saassurface-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Graceful shutdown: give connections 5s to finish before kill
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Log management
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      max_size: '50M',
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
