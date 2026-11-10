import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Authentification admin : nom + mot de passe définis dans les variables
 * d'environnement ADMIN_NAME et ADMIN_PASSWORD (fichier .env.local).
 * Le jeton renvoyé est signé (HMAC) et expire au bout de 7 jours ;
 * changer le mot de passe invalide tous les jetons existants.
 */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_NAME?.trim() && (process.env.ADMIN_PASSWORD?.length ?? 0) >= 6;
}

const sha = (s: string) => createHash('sha256').update(s).digest();

function signingKey() {
  return sha(`partyhub-admin:${process.env.ADMIN_NAME}:${process.env.ADMIN_PASSWORD}`);
}

export function checkCredentials(name: unknown, password: unknown): boolean {
  if (!adminConfigured() || typeof name !== 'string' || typeof password !== 'string') return false;
  const nameOk = name.trim().toLowerCase() === process.env.ADMIN_NAME!.trim().toLowerCase();
  const passOk = timingSafeEqual(sha(password), sha(process.env.ADMIN_PASSWORD!));
  return nameOk && passOk;
}

export function createToken(): string {
  const payload = Buffer.from(JSON.stringify({ n: process.env.ADMIN_NAME!.trim(), exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Renvoie le nom de l'admin si le jeton est valide, sinon null. */
export function verifyToken(token: string | undefined): string | null {
  if (!token || !adminConfigured()) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', signingKey()).update(payload).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now() ? String(data.n) : null;
  } catch {
    return null;
  }
}

/* Anti-bruteforce : 10 échecs max par IP sur 15 minutes */
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export function isRateLimited(ip: string): boolean {
  const f = failures.get(ip);
  return !!f && f.until > Date.now() && f.count >= 10;
}

export function recordFailure(ip: string) {
  const f = failures.get(ip);
  if (!f || f.until < Date.now()) failures.set(ip, { count: 1, until: Date.now() + WINDOW_MS });
  else f.count++;
}
