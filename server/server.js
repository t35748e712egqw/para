const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

// Railway automatically injects PORT
const PORT = process.env.PORT || 8080;

// 1. Create HTTP Server for Health-Check
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    status: 'online',
    game: 'PARADOX ROOM — Room 02 Game Server',
    activeRooms: rooms.size,
    uptime: Math.round(process.uptime()) + ' seconds',
    timestamp: new Date().toISOString()
  }));
});

// 2. Attach WebSocket Server to HTTP Server
const wss = new WebSocketServer({ server });

// Active Rooms Map: roomId -> { players: Map(playerId -> playerObj), puzzleState: {...} }
const rooms = new Map();

wss.on('connection', (ws, req) => {
  let currentRoomId = null;
  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  let playerReality = 1;

  console.log(`[Connect] New client connected: ${playerId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Event 1: Join / Create Room
      if (data.type === 'JOIN_ROOM') {
        const roomId = (data.roomId || 'ROOM_02_DEFAULT').trim().toUpperCase();
        currentRoomId = roomId;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            players: new Map(),
            puzzleState: {
              bridgeActive: false,
              exitUnlocked: false
            }
          });
          console.log(`[Room Created] Room ID: ${roomId}`);
        }

        const room = rooms.get(roomId);

        // Assign reality: First player gets Reality 1, second gets Reality 2
        playerReality = room.players.size === 0 ? 1 : 2;

        room.players.set(playerId, {
          ws,
          reality: playerReality,
          position: { x: 0, y: 0, z: 11 },
          rotation: { yaw: 0, pitch: 0 }
        });

        // Send confirmation back to joined player
        ws.send(JSON.stringify({
          type: 'ROOM_JOINED',
          playerId,
          reality: playerReality,
          puzzleState: room.puzzleState,
          playerCount: room.players.size
        }));

        // Notify other players in the room
        room.players.forEach((p, id) => {
          if (id !== playerId && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({
              type: 'PLAYER_JOINED',
              newPlayerId: playerId,
              reality: playerReality,
              playerCount: room.players.size
            }));
          }
        });

        console.log(`[Join] ${playerId} joined ${roomId} as Reality ${playerReality} (${room.players.size} players in room)`);
      }

      // Event 2: Puzzle Synchronization (Bridge activated in Reality 2)
      if (data.type === 'UPDATE_PUZZLE') {
        if (!currentRoomId || !rooms.has(currentRoomId)) return;
        const room = rooms.get(currentRoomId);

        room.puzzleState = {
          ...room.puzzleState,
          ...data.puzzleState
        };

        // Broadcast updated puzzle state to all players in the room
        room.players.forEach((p) => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({
              type: 'PUZZLE_SYNC',
              puzzleState: room.puzzleState,
              triggeredBy: playerId
            }));
          }
        });

        console.log(`[Puzzle] Room ${currentRoomId} updated:`, room.puzzleState);
      }

      // Event 3: Real-Time Player Movement & Rotation Broadcast
      if (data.type === 'PLAYER_MOVE') {
        if (!currentRoomId || !rooms.has(currentRoomId)) return;
        const room = rooms.get(currentRoomId);

        // Send to remote players
        room.players.forEach((p, id) => {
          if (id !== playerId && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({
              type: 'REMOTE_PLAYER_MOVE',
              playerId,
              reality: playerReality,
              position: data.position,
              rotation: data.rotation
            }));
          }
        });
      }

      // Event 4: Room Win / Cleared Broadcast
      if (data.type === 'ROOM_WON') {
        if (!currentRoomId || !rooms.has(currentRoomId)) return;
        const room = rooms.get(currentRoomId);

        room.players.forEach((p) => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({
              type: 'ROOM_WON_BROADCAST',
              completionTime: data.completionTime
            }));
          }
        });
      }
    } catch (err) {
      console.error('[Error] Failed to process message:', err.message);
    }
  });

  // Client disconnect
  ws.on('close', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      room.players.delete(playerId);

      // Notify remaining players
      room.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(JSON.stringify({
            type: 'PLAYER_LEFT',
            leftPlayerId: playerId,
            playerCount: room.players.size
          }));
        }
      });

      // Cleanup empty room
      if (room.players.size === 0) {
        rooms.delete(currentRoomId);
        console.log(`[Room Cleaned] Room ${currentRoomId} closed.`);
      }
    }
    console.log(`[Disconnect] Player ${playerId} left.`);
  });
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` PARADOX ROOM — WebSocket Game Server Online `);
  console.log(` Listening on port: ${PORT}`);
  console.log(` Health Check: http://0.0.0.0:${PORT}/`);
  console.log(`===============================================`);
});
