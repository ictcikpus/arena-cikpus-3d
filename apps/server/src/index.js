import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { BattleRoom } from './rooms/BattleRoom.js';

const port = Number(process.env.PORT || 2567);
const httpServer = createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ service: 'Arena Cikpus 3D Multiplayer', status: 'ok', room: 'battle', maxPlayers: 10 }));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Arena Cikpus 3D multiplayer endpoint');
});
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('battle', BattleRoom);
gameServer.define('custom-battle', BattleRoom);
httpServer.listen(port, '0.0.0.0', () => console.log(`Arena Cikpus 3D Colyseus server listening on ${port}`));
