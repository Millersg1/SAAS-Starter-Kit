module.exports = {
  apps: [
    {
      name: 'clienthub-api',
      script: 'server.js',
      instances: 1, // Can be set to 'max' to run in cluster mode on multi-core servers
      autorestart: true,
      watch: false, // Should be false in production
      max_memory_restart: '1G', // Restart if it exceeds 1GB of memory
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        // Note: PORT, database credentials, and other secrets
        // should be managed in a .env file on your server.
      },
    },
  ],
};