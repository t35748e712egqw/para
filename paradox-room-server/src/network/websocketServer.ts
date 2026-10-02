import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PROTOCOL_VERSION } from './websocketTypes';
import {
  MAX_MESSAGE_SIZE_BYTES,
  addConnection,
  removeConnection,
  getConnection,
  getConnectionCount,
  getAllConnections,
  generateConnectionId,
  sendJson,
  sendError,
  parseAndValidateMessage,
} from './websocketUtils';

export interface WebSocketManager {
  wss: WebSocketServer;
  close: () => Promise<void>;
  getActiveConnectionsCount: () => number;
}

export function createWebSocketServer(httpServer: HttpServer): WebSocketManager {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    maxPayload: MAX_MESSAGE_SIZE_BYTES,
  });

  // Keepalive heartbeat timer (30 seconds)
  const HEARTBEAT_INTERVAL_MS = 30000;
  const heartbeatInterval = setInterval(() => {
    for (const tracked of getAllConnections()) {
      if (!tracked.isAlive) {
        console.log(`[WebSocket] Terminating inactive connection: ${tracked.id}`);
        tracked.ws.terminate();
        removeConnection(tracked.id);
        continue;
      }
      tracked.isAlive = false;
      tracked.ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Unref timer so it doesn't keep node event loop open on process exit
  heartbeatInterval.unref();

  wss.on('connection', (ws: WebSocket, req) => {
    const connectionId = generateConnectionId();
    const remoteIp = req.socket.remoteAddress;

    const tracked = addConnection(connectionId, ws, remoteIp);

    console.log(
      `[WebSocket Connected] ID: ${connectionId} | IP: ${remoteIp || 'unknown'} | Total: ${getConnectionCount()}`
    );

    // Setup native ping/pong heartbeat listener
    ws.on('pong', () => {
      tracked.isAlive = true;
    });

    // Send Welcome message
    sendJson(ws, {
      protocolVersion: PROTOCOL_VERSION,
      type: 'WELCOME',
      connectionId,
      payload: {
        connectionId,
      },
    });

    // Handle incoming messages
    ws.on('message', (data: unknown) => {
      // Validate and parse
      const result = parseAndValidateMessage(data);

      if (!result.valid || !result.message) {
        sendError(
          ws,
          result.errorCode || 'INVALID_MESSAGE',
          result.errorMessage || 'Invalid WebSocket message.'
        );
        return;
      }

      const { type, payload } = result.message;
      console.log(`[WebSocket Message] ID: ${connectionId} | Type: ${type}`);

      switch (type) {
        case 'PING': {
          sendJson(ws, {
            protocolVersion: PROTOCOL_VERSION,
            type: 'PONG',
            payload: {
              timestamp: Date.now(),
            },
          });
          break;
        }

        case 'ECHO': {
          sendJson(ws, {
            protocolVersion: PROTOCOL_VERSION,
            type: 'ECHO',
            payload: payload || {},
          });
          break;
        }

        default: {
          sendError(ws, 'UNKNOWN_TYPE', `Unhandled message type: ${type}`);
          break;
        }
      }
    });

    // Handle connection errors
    ws.on('error', (err) => {
      console.error(`[WebSocket Error] ID: ${connectionId}:`, err.message);
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
      removeConnection(connectionId);
      console.log(
        `[WebSocket Disconnected] ID: ${connectionId} | Code: ${code} | Reason: ${reason.toString() || 'none'} | Remaining: ${getConnectionCount()}`
      );
    });
  });

  wss.on('error', (err) => {
    console.error('[WebSocket Server Error]:', err);
  });

  // Graceful shutdown helper
  async function close(): Promise<void> {
    clearInterval(heartbeatInterval);

    // Close all active client connections gracefully
    const activeConnections = getAllConnections();
    for (const tracked of activeConnections) {
      try {
        if (tracked.ws.readyState === WebSocket.OPEN) {
          tracked.ws.close(1001, 'Server shutting down');
        }
      } catch {
        tracked.ws.terminate();
      }
    }

    return new Promise<void>((resolve) => {
      wss.close((err) => {
        if (err) {
          console.error('[WebSocket Close Error]:', err);
        }
        resolve();
      });
    });
  }

  return {
    wss,
    close,
    getActiveConnectionsCount: getConnectionCount,
  };
}
