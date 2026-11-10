import type { IncomingMessage, ServerResponse } from 'node:http';
import { QUIZ_QUESTIONS } from '../../content/quiz';
import { adminConfigured, checkCredentials, createToken, isRateLimited, recordFailure, verifyToken } from './auth';
import { addQuestion, deleteQuestion, loadCustomQuestions, parseQuestion, updateQuestion } from './questionStore';

/**
 * API REST de l'espace admin (servie par le même serveur que Next.js) :
 *   GET    /api/admin/status
 *   POST   /api/admin/login              { name, password } -> { token, name }
 *   GET    /api/admin/questions          (auth)
 *   POST   /api/admin/questions          (auth) nouvelle question
 *   PUT    /api/admin/questions/:id      (auth)
 *   DELETE /api/admin/questions/:id      (auth)
 */
function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 20_000) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export async function handleAdminRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/admin/')) return false;
  const route = url.pathname.slice('/api/admin/'.length);
  const method = req.method ?? 'GET';

  try {
    if (route === 'status' && method === 'GET') {
      send(res, 200, { configured: adminConfigured() });
      return true;
    }

    if (route === 'login' && method === 'POST') {
      const ip = req.socket.remoteAddress ?? '?';
      if (!adminConfigured()) return send(res, 503, { error: 'Admin non configuré : renseigne ADMIN_NAME et ADMIN_PASSWORD dans .env.local.' }), true;
      if (isRateLimited(ip)) return send(res, 429, { error: 'Trop de tentatives, réessaie dans 15 minutes.' }), true;
      const body = (await readJson(req)) as { name?: unknown; password?: unknown };
      if (!checkCredentials(body.name, body.password)) {
        recordFailure(ip);
        return send(res, 401, { error: 'Nom ou mot de passe incorrect.' }), true;
      }
      send(res, 200, { token: createToken(), name: process.env.ADMIN_NAME!.trim() });
      return true;
    }

    const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const admin = verifyToken(auth);
    if (!admin) return send(res, 401, { error: 'Session admin expirée, reconnecte-toi.' }), true;

    const m = route.match(/^questions(?:\/([\w-]+))?$/);
    if (!m) return send(res, 404, { error: 'Route inconnue.' }), true;
    const id = m[1];

    if (!id && method === 'GET') {
      const custom = loadCustomQuestions().sort((a, b) => b.createdAt - a.createdAt);
      send(res, 200, { custom, builtinCount: QUIZ_QUESTIONS.length, builtin: QUIZ_QUESTIONS });
      return true;
    }
    if (!id && method === 'POST') {
      const q = parseQuestion(await readJson(req));
      if (typeof q === 'string') return send(res, 400, { error: q }), true;
      send(res, 201, { question: addQuestion(q, admin) });
      return true;
    }
    if (id && method === 'PUT') {
      const q = parseQuestion(await readJson(req));
      if (typeof q === 'string') return send(res, 400, { error: q }), true;
      const updated = updateQuestion(id, q);
      return send(res, updated ? 200 : 404, updated ? { question: updated } : { error: 'Question introuvable.' }), true;
    }
    if (id && method === 'DELETE') {
      return send(res, deleteQuestion(id) ? 200 : 404, { ok: true }), true;
    }
    send(res, 405, { error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('[admin]', err);
    send(res, 400, { error: 'Requête invalide.' });
  }
  return true;
}
