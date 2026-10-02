# PARADOX ROOM Multiplayer Server

Backend foundation and WebSocket communication layer for the PARADOX ROOM Android game.

## Technology
- Node.js
- TypeScript
- Express
- ws (WebSocket)

## Purpose
This project provides the production-ready HTTP and WebSocket server foundation for the PARADOX ROOM backend. It is designed for seamless deployment on platforms like Railway, binding to `0.0.0.0`, dynamically reading `process.env.PORT`, and sharing a single HTTP/WebSocket server instance.

> **Note:** Gameplay systems (room creation/joining, matchmaking, Reality Shift synchronization, and puzzle synchronization) will be added in subsequent phases.

## Commands

```bash
# 1. Install dependencies
npm install

# 2. Run development server with tsx
npm run dev

# 3. Build for production (compiles TypeScript to dist/)
npm run build

# 4. Start production server (runs compiled JavaScript from dist/)
npm start

# 5. Run automated test suite
node test-suite.js
```

## Endpoints

### 1. Root Information
- **Method:** `GET`
- **Path:** `/`
- **Response:**
  ```json
  {
    "game": "PARADOX ROOM",
    "service": "multiplayer-server",
    "status": "online"
  }
  ```

### 2. Health Check
- **Method:** `GET`
- **Path:** `/health`
- **Status Code:** `200 OK`
- **Response:**
  ```json
  {
    "status": "ok",
    "game": "PARADOX ROOM",
    "service": "multiplayer-server",
    "websocketConnections": 0
  }
  ```

### 3. WebSocket Endpoint
- **URL (Local):** `ws://localhost:3000/ws`
- **URL (Railway):** `wss://YOUR-APP.up.railway.app/ws`

---

## WebSocket Protocol (Version 1)

### 1. Connection Welcome (Server → Client)
Sent immediately upon connection:
```json
{
  "protocolVersion": 1,
  "type": "WELCOME",
  "connectionId": "conn_90u1cxygimuqmjn2p",
  "payload": {
    "connectionId": "conn_90u1cxygimuqmjn2p"
  }
}
```

### 2. PING / PONG (Heartbeat / Latency)
- **Client Request:**
  ```json
  {
    "protocolVersion": 1,
    "type": "PING",
    "payload": {}
  }
  ```
- **Server Response:**
  ```json
  {
    "protocolVersion": 1,
    "type": "PONG",
    "payload": {
      "timestamp": 1727853068000
    }
  }
  ```

### 3. ECHO (Diagnostic Test)
- **Client Request:**
  ```json
  {
    "protocolVersion": 1,
    "type": "ECHO",
    "payload": {
      "message": "hello"
    }
  }
  ```
- **Server Response:**
  ```json
  {
    "protocolVersion": 1,
    "type": "ECHO",
    "payload": {
      "message": "hello"
    }
  }
  ```

### 4. ERROR (Malformed or Unknown Messages)
- **Server Response:**
  ```json
  {
    "protocolVersion": 1,
    "type": "ERROR",
    "payload": {
      "code": "INVALID_JSON",
      "message": "Invalid JSON syntax."
    }
  }
  ```

---

## Railway Deployment
- The server binds to host `0.0.0.0` and listens to `process.env.PORT`.
- Single shared port for both HTTP (`GET /`, `GET /health`) and WebSocket (`/ws`).
- Railway handles SSL termination, providing automatic `https://` and `wss://`.
- Build command: `npm run build`
- Start command: `npm start`
