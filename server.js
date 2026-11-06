import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const port = Number(process.env.PORT || 3000);
const dataDir = resolve(process.env.DATA_DIR || './data');
await mkdir(dataDir, { recursive: true });
const db = new DatabaseSync(resolve(dataDir, 'revision.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL, progress TEXT NOT NULL DEFAULT '{}'); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);`);
const sessions = new Map();
const hash = (s) => createHash('sha256').update(s).digest('hex');
const cookie = (req) => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('session='))?.slice(8);
const userFor = (req) => { const token = cookie(req); return token && db.prepare('SELECT users.id, users.name, users.email, users.progress FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND sessions.expires > ?').get(hash(token), Date.now()); };
const send = (res, status, data, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(data)); };
const body = async (req) => { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100_000) throw Error('Request too large'); } return JSON.parse(raw || '{}'); };
const setSession = (res, user, secure) => { const token = randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(token), user.id, Date.now() + 1000 * 60 * 60 * 24 * 30); return { 'Set-Cookie': `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure ? '; Secure' : ''}` }; };
const safeUser = u => ({ name: u.name, email: u.email });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: 'Invalid origin' });
      if (url.pathname === '/api/session' && req.method === 'GET') { const u = userFor(req); return send(res, 200, { user: u ? safeUser(u) : null, progress: u ? JSON.parse(u.progress) : null }); }
      if ((url.pathname === '/api/register' || url.pathname === '/api/login') && req.method === 'POST') {
        const ip = req.socket.remoteAddress; const recent = (sessions.get(ip) || []).filter(t => t > Date.now() - 60000); recent.push(Date.now()); sessions.set(ip, recent); if (recent.length > 12) return send(res, 429, { error: 'Too many attempts. Please try again in a minute.' });
        const input = await body(req); const email = String(input.email || '').trim().toLowerCase(); const password = String(input.password || '');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) return send(res, 400, { error: 'Enter a valid email and a password of at least 8 characters.' });
        let u;
        if (url.pathname === '/api/register') {
          const name = String(input.name || '').trim().slice(0, 60); if (!name) return send(res, 400, { error: 'Please enter your name.' });
          if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return send(res, 409, { error: 'An account with that email already exists.' });
          const salt = randomBytes(16).toString('hex'); const digest = scryptSync(password, salt, 64).toString('hex');
          const result = db.prepare('INSERT INTO users (name,email,salt,password) VALUES (?,?,?,?)').run(name,email,salt,digest); u = { id: Number(result.lastInsertRowid), name, email, progress: '{}' };
        } else {
          u = db.prepare('SELECT * FROM users WHERE email = ?').get(email); const actual = scryptSync(password, u?.salt || 'dummy-salt', 64); const expected = u ? Buffer.from(u.password, 'hex') : Buffer.alloc(64);
          if (!timingSafeEqual(actual, expected) || !u) return send(res, 401, { error: 'Incorrect email or password.' });
        }
        return send(res, 200, { user: safeUser(u), progress: JSON.parse(u.progress) }, setSession(res, u, req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted));
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') { const token = cookie(req); if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token)); return send(res, 200, { ok: true }, { 'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }); }
      if (url.pathname === '/api/progress' && req.method === 'PUT') { const u = userFor(req); if (!u) return send(res, 401, { error: 'Please sign in first.' }); const data = await body(req); if (!data || typeof data !== 'object' || Array.isArray(data)) return send(res, 400, { error: 'Invalid progress.' }); db.prepare('UPDATE users SET progress = ? WHERE id = ?').run(JSON.stringify(data), u.id); return send(res, 200, { ok: true }); }
      return send(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); const root = resolve('./public'); const file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const content = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) { if (error.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); } else { send(res, 400, { error: 'Could not process request.' }); } }
}).listen(port, '0.0.0.0', () => console.log(`Revision workspace listening on ${port}`));
