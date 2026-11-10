import { createServer } from 'node:http';
import nextEnv from '@next/env';
import next from 'next';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/events';
import { handleAdminRequest } from './admin/http';
import { registerSocketHandlers } from './socket';

/**
 * Serveur unique : Next.js (pages) + Socket.io (temps réel) sur le même port.
 */
const dev = process.env.NODE_ENV !== 'production';
// Charge .env, .env.local… avant toute lecture de process.env
nextEnv.loadEnvConfig(process.cwd(), dev);
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer(async (req, res) => {
  if (await handleAdminRequest(req, res)) return;
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  handle(req, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: '/socket.io',
  pingInterval: 10_000,
  pingTimeout: 8_000,
});

const rooms = registerSocketHandlers(io);

httpServer.listen(port, hostname, () => {
  console.log(`\n  🎮 PartyHub prêt sur http://localhost:${port}  (${dev ? 'dev' : 'production'})\n`);
});
