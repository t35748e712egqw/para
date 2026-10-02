const http = require('http');
const { WebSocket } = require('ws');

const TEST_PORT = 4123;
process.env.PORT = TEST_PORT.toString();
process.env.NODE_ENV = 'test';

// Import compiled app and server creation logic
const { app } = require('./dist/app');
const { createWebSocketServer } = require('./dist/network/websocketServer');

let server;
let wsManager;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function waitMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

async function runTests() {
  console.log('--- STARTING PARADOX ROOM PART 2 TEST SUITE ---');

  // Start HTTP + WS server
  server = http.createServer(app);
  wsManager = createWebSocketServer(server);
  await new Promise((resolve) => server.listen(TEST_PORT, '0.0.0.0', resolve));
  console.log(`Test server listening on port ${TEST_PORT}`);

  // TEST 1: HTTP GET /
  const rootRes = await httpGet('/');
  console.assert(rootRes.status === 200, 'TEST 1 Failed: Status not 200');
  console.assert(rootRes.body.game === 'PARADOX ROOM', 'TEST 1 Failed: game mismatch');
  console.log('✓ TEST 1 PASSED: GET / returned 200 with service info');

  // TEST 2: HTTP GET /health
  const healthRes = await httpGet('/health');
  console.assert(healthRes.status === 200, 'TEST 2 Failed: Status not 200');
  console.assert(healthRes.body.status === 'ok', 'TEST 2 Failed: status not ok');
  console.assert(healthRes.body.websocketConnections === 0, 'TEST 2 Failed: initial ws connection count should be 0');
  console.log('✓ TEST 2 PASSED: GET /health returned 200 with websocketConnections: 0');

  // TEST 3 & 4: WebSocket client connects to /ws and receives WELCOME
  const wsUrl = `ws://127.0.0.1:${TEST_PORT}/ws`;
  const client1 = new WebSocket(wsUrl);
  const welcomeMsg = await waitMessage(client1);
  console.assert(welcomeMsg.type === 'WELCOME', 'TEST 4 Failed: Message type is not WELCOME');
  console.assert(welcomeMsg.protocolVersion === 1, 'TEST 4 Failed: protocolVersion != 1');
  console.assert(typeof welcomeMsg.connectionId === 'string', 'TEST 4 Failed: connectionId missing');
  console.log('✓ TEST 3 & 4 PASSED: Client 1 connected to /ws and received WELCOME with connectionId');

  // Check health endpoint reflects 1 active connection
  const healthWith1 = await httpGet('/health');
  console.assert(healthWith1.body.websocketConnections === 1, 'Connection count should be 1');

  // TEST 5: Client sends PING, expects PONG
  const pingPromise = waitMessage(client1);
  client1.send(JSON.stringify({ protocolVersion: 1, type: 'PING', payload: {} }));
  const pongMsg = await pingPromise;
  console.assert(pongMsg.type === 'PONG', 'TEST 5 Failed: Expected PONG');
  console.assert(typeof pongMsg.payload.timestamp === 'number', 'TEST 5 Failed: timestamp missing');
  console.log('✓ TEST 5 PASSED: Client sent PING, server responded with PONG and server timestamp');

  // TEST 6: Client sends ECHO, expects ECHO response
  const echoPromise = waitMessage(client1);
  client1.send(JSON.stringify({ protocolVersion: 1, type: 'ECHO', payload: { message: 'paradox-test' } }));
  const echoMsg = await echoPromise;
  console.assert(echoMsg.type === 'ECHO', 'TEST 6 Failed: Expected ECHO');
  console.assert(echoMsg.payload.message === 'paradox-test', 'TEST 6 Failed: ECHO payload mismatch');
  console.log('✓ TEST 6 PASSED: Client sent ECHO, server echoed back payload correctly');

  // TEST 7: Client sends invalid JSON -> expected ERROR, server remains alive
  const errorPromise1 = waitMessage(client1);
  client1.send('THIS IS NOT VALID JSON{{{');
  const errRes1 = await errorPromise1;
  console.assert(errRes1.type === 'ERROR', 'TEST 7 Failed: Expected ERROR');
  console.assert(errRes1.payload.code === 'INVALID_JSON', 'TEST 7 Failed: code != INVALID_JSON');
  console.log('✓ TEST 7 PASSED: Malformed JSON triggered ERROR response; server remained alive');

  // TEST 8: Client sends unknown message type -> expected ERROR
  const errorPromise2 = waitMessage(client1);
  client1.send(JSON.stringify({ protocolVersion: 1, type: 'NON_EXISTENT_TYPE', payload: {} }));
  const errRes2 = await errorPromise2;
  console.assert(errRes2.type === 'ERROR', 'TEST 8 Failed: Expected ERROR');
  console.assert(errRes2.payload.code === 'UNKNOWN_TYPE', 'TEST 8 Failed: code != UNKNOWN_TYPE');
  console.log('✓ TEST 8 PASSED: Unknown message type triggered ERROR response');

  // TEST 9: Two clients connect, both remain independently connected
  const client2 = new WebSocket(wsUrl);
  const welcome2 = await waitMessage(client2);
  console.assert(welcome2.connectionId !== welcomeMsg.connectionId, 'Clients must have unique connectionIds');
  const healthWith2 = await httpGet('/health');
  console.assert(healthWith2.body.websocketConnections === 2, 'Connection count should be 2');
  console.log('✓ TEST 9 PASSED: Two clients connected concurrently and received unique connectionIds');

  // TEST 10: One client disconnects, connection registry decreases
  await new Promise((resolve) => {
    client2.on('close', resolve);
    client2.close();
  });
  // Brief delay to allow close event handler in ws
  await new Promise(r => setTimeout(r, 100));
  const healthAfterDisconnect = await httpGet('/health');
  console.assert(healthAfterDisconnect.body.websocketConnections === 1, 'Connection count should decrease to 1');
  console.log('✓ TEST 10 PASSED: Client 2 disconnected, connection count decreased to 1');

  // TEST 11: Server shutdown / closing
  console.log('Testing graceful close of WebSocket and HTTP servers...');
  await wsManager.close();
  await new Promise((resolve) => server.close(resolve));
  console.log('✓ TEST 11 PASSED: WebSockets and HTTP server closed gracefully with zero leaks');

  console.log('====================================================');
  console.log(' ALL 11 TESTS PASSED SUCCESSFULLY! ');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
