import type { WebSocket } from 'ws';

export const PROTOCOL_VERSION = 1;

export type MessageType = 'WELCOME' | 'PING' | 'PONG' | 'ECHO' | 'ERROR';

export interface BaseMessage<T extends MessageType, P = Record<string, unknown>> {
  protocolVersion: number;
  type: T;
  payload: P;
  connectionId?: string;
}

export interface WelcomePayload {
  connectionId: string;
}

export interface PingPayload {
  [key: string]: unknown;
}

export interface PongPayload {
  timestamp: number;
}

export interface EchoPayload {
  message?: string;
  [key: string]: unknown;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type WelcomeMessage = BaseMessage<'WELCOME', WelcomePayload>;
export type PingMessage = BaseMessage<'PING', PingPayload>;
export type PongMessage = BaseMessage<'PONG', PongPayload>;
export type EchoMessage = BaseMessage<'ECHO', EchoPayload>;
export type ErrorMessage = BaseMessage<'ERROR', ErrorPayload>;

export type WebSocketMessage =
  | WelcomeMessage
  | PingMessage
  | PongMessage
  | EchoMessage
  | ErrorMessage;

export interface TrackedSocket {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  connectedAt: Date;
  remoteAddress?: string;
}
