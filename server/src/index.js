import http from 'http';
import app from './app.js';
import config from './config.js';
// We import seed to ensure the in-memory store is populated when the server starts
import { seedStore } from './store/seed.js';

// Run seed before starting
await seedStore();

const server = http.createServer(app);

server.listen(config.server.port, () => {
  // eslint-disable-next-line no-console
  console.log(`
🚀 AtomQuest Server is running!
-----------------------------------------
🌍 Environment: ${config.server.nodeEnv}
🔌 Port: ${config.server.port}
🔗 Base URL: http://localhost:${config.server.port}/api/v1
-----------------------------------------
  `);
});

// Graceful shutdown handling for 12-factor compliance
const shutdown = () => {
  // eslint-disable-next-line no-console
  console.log('🛑 Received kill signal, shutting down gracefully...');
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('💤 Closed out remaining connections.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
