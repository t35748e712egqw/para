import { WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  TrackedSocket,
  WebSocketMessage,
  MessageType,
} from './websocketTypes';

// Configurable max payload size (default 64 KB)
export const MAX_MESSAGE_SIZE_BYTES = 64 * 1024;

// In-Memory Connection Registry
const connectionRegistry = new Map<string, TrackedSocket>();

export function generateConnectionId(): string {
  return 'conn_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function addConnection(
  id: string,
  ws: WebSocket,
  remoteAddress?: string
): TrackedSocket {
  const tracked: TrackedSocket = {
    id,
    ws,
    isAlive: true,
    connectedAt: new Date(),
    remoteAddress,
  };
  connectionRegistry.set(id, tracked);
  return tracked;
}

export function removeConnection(id: string): boolean {
  return connectionRegistry.delete(id);
}

export function getConnection(id: string): TrackedSocket | undefined {
  return connectionRegistry.get(id);
}

export function getConnectionCount(): number {
  return connectionRegistry.size;
}

export function getAllConnections(): TrackedSocket[] {
  return Array.from(connectionRegistry.values());
}

export function clearAllConnections(): void {
  connectionRegistry.clear();
}

// Outgoing message helpers
export function sendJson(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function sendError(ws: WebSocket, code: string, message: string): void {
  sendJson(ws, {
    protocolVersion: PROTOCOL_VERSION,
    type: 'ERROR',
    payload: {
      code,
      message,
    },
  });
}

// Inbound message validation
export interface ParseResult {
  valid: boolean;
  message?: WebSocketMessage;
  errorCode?: string;
  errorMessage?: string;
}

const VALID_MESSAGE_TYPES: MessageType[] = ['PING', 'PONG', 'ECHO'];

export function parseAndValidateMessage(raw: unknown): ParseResult {
  if (typeof raw !== 'string' && !Buffer.isBuffer(raw)) {
    return {
      valid: false,
      errorCode: 'INVALID_MESSAGE',
      errorMessage: 'Message must be a string or utf-8 buffer.',
    };
  }

  const rawStr = typeof raw === 'string' ? raw : raw.toString('utf-8');

  if (rawStr.length > MAX_MESSAGE_SIZE_BYTES) {
    return {
      valid: false,
      errorCode: 'MESSAGE_TOO_LARGE',
      errorMessage: `Message exceeds maximum allowed size of ${MAX_MESSAGE_SIZE_BYTES} bytes.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawStr);
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_JSON',
      errorMessage: 'Invalid JSON syntax.',
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      errorCode: 'INVALID_MESSAGE',
      errorMessage: 'Message must be a JSON object.',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate protocol version
  if (typeof obj.protocolVersion !== 'number' || obj.protocolVersion !== PROTOCOL_VERSION) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_PROTOCOL',
      errorMessage: `Unsupported or missing protocolVersion. Expected: ${PROTOCOL_VERSION}`,
    };
  }

  // Validate type
  if (typeof obj.type !== 'string' || obj.type.trim() === '') {
    return {
      valid: false,
      errorCode: 'MISSING_TYPE',
      errorMessage: 'Missing or empty message type.',
    };
  }

  const msgType = obj.type as MessageType;
  if (!VALID_MESSAGE_TYPES.includes(msgType)) {
    return {
      valid: false,
      errorCode: 'UNKNOWN_TYPE',
      errorMessage: `Unknown message type: "${obj.type}".`,
    };
  }

  // Validate payload
  if (typeof obj.payload !== 'object' || obj.payload === null || Array.isArray(obj.payload)) {
    return {
      valid: false,
      errorCode: 'INVALID_PAYLOAD',
      errorMessage: 'Payload must be a JSON object.',
    };
  }

  return {
    valid: true,
    message: obj as unknown as WebSocketMessage,
  };
}
