import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { createWebSocketServer } from './network/websocketServer';

const server = http.createServer(app);

// Attach WebSocket communication layer to the shared HTTP server on path /ws
const wsManager = createWebSocketServer(server);

server.listen(env.port, env.host, () => {
  console.log('====================================================');
  console.log('Server name : PARADOX ROOM Multiplayer Server');
  console.log(`Environment : ${env.nodeEnv}`);
  console.log(`Host        : ${env.host}`);
  console.log(`Port        : ${env.port}`);
  console.log(`WebSocket   : ws://${env.host}:${env.port}/ws`);
  console.log('Status      : Server started successfully.');
  console.log('====================================================');
});

// Graceful Shutdown for SIGTERM and SIGINT
let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Shutdown] Received ${signal}. Closing server resources gracefully...`);

  // Force exit after timeout if open connections hang
  const forceTimer = setTimeout(() => {
    console.error('[Shutdown Timeout] Forcefully terminating process after 5s.');
    process.exit(1);
  }, 5000);
  forceTimer.unref();

  try {
    // 1. Close WebSocket server and active client connections
    console.log('[Shutdown] Closing active WebSocket connections...');
    await wsManager.close();
    console.log('[Shutdown] WebSocket server closed.');

    // 2. Close HTTP server
    console.log('[Shutdown] Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log('[Shutdown] HTTP server closed cleanly. Exiting process.');

    process.exit(0);
  } catch (err) {
    console.error('[Shutdown Error] Error during server shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  handleShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  handleShutdown('SIGINT');
});
