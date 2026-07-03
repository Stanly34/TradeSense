module.exports = {
  apps: [
    {
      name: 'tradesense-server',
      cwd: './server',
      script: 'node',
      args: '--import tsx src/server.ts',
      exec_mode: 'fork',
      env: {
        PORT: 5000,
      },
    },
    {
      name: 'tradesense-client',
      cwd: './client',
      script: 'node',
      args: './node_modules/vite/bin/vite.js --host',
      exec_mode: 'fork',
      env: {
        PORT: 5173,
      },
    },
  ],
};
