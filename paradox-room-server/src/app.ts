import express, { Request, Response, NextFunction } from 'express';
import { getConnectionCount } from './network/websocketUtils';

const app = express();

// Middleware: parse incoming JSON bodies
app.use(express.json());

// Root Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    game: 'PARADOX ROOM',
    service: 'multiplayer-server',
    status: 'online',
  });
});

// Health Endpoint for Railway and deployment monitoring
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    game: 'PARADOX ROOM',
    service: 'multiplayer-server',
    websocketConnections: getConnectionCount(),
  });
});

// 404 Handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Centralized Error Handling Middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log unexpected internal errors safely on server side
  console.error('[Error] Internal server error:', err.message);

  // Never leak raw stack traces to the client
  res.status(500).json({
    error: 'Internal server error',
  });
});

export { app };
