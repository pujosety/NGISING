import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createSessionToken,
  hashPassword,
  toPublicUser,
  verifyPassword,
  verifySessionToken,
} from './src/server/auth.ts';
import { createSeedState, createSeedUsers } from './src/server/seedData.ts';
import {
  joinQueue,
  leaveQueue,
  occupyStall,
  promoteNextEligible,
  releaseStall,
  toggleStallMaintenance,
  validateEmployeeInput,
  validateRegistrationInput,
} from './src/shared/queueLogic.ts';
import type { NeedType, OfficeState, StoredUserRecord } from './src/shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'ngising-state.json');

interface PersistedDatabase {
  authSecret: string;
  users: StoredUserRecord[];
  office: OfficeState;
}

function persistDatabase(db: PersistedDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STATE_FILE);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

function loadOrCreateDatabase(): PersistedDatabase {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedDatabase;
      if (
        parsed &&
        typeof parsed.authSecret === 'string' &&
        Array.isArray(parsed.users) &&
        parsed.office &&
        parsed.office.toilet &&
        Array.isArray(parsed.office.queue) &&
        Array.isArray(parsed.office.history)
      ) {
        parsed.office = promoteNextEligible(parsed.office, Date.now());
        return parsed;
      }
    }
  } catch {
    // Fallback to fresh seed if JSON is missing or corrupted
  }
  const now = Date.now();
  const fresh: PersistedDatabase = {
    authSecret: crypto.randomBytes(32).toString('hex'),
    users: createSeedUsers(now),
    office: createSeedState(now),
  };
  persistDatabase(fresh);
  return fresh;
}

const db: PersistedDatabase = loadOrCreateDatabase();

interface AuthenticatedRequest extends Request {
  authUser?: StoredUserRecord;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Silakan masuk ke akun Ngising terlebih dahulu.' });
    return;
  }
  const verified = verifySessionToken(token, db.authSecret);
  if (!verified) {
    res.status(401).json({ error: 'Sesi login telah berakhir. Silakan masuk kembali.' });
    return;
  }
  const user = db.users.find((u) => u.id === verified.userId);
  if (!user) {
    res.status(401).json({ error: 'Akun tidak ditemukan.' });
    return;
  }
  req.authUser = user;
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const getPublicState = (): OfficeState => ({
    ...db.office,
    onlineCount: wss.clients.size,
    serverNow: Date.now(),
  });

  const broadcastState = (): void => {
    const payload = JSON.stringify({
      type: 'state:sync',
      state: getPublicState(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  const commitOfficeState = (next: OfficeState): void => {
    db.office = next;
    persistDatabase(db);
    broadcastState();
  };

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'state:sync',
        state: getPublicState(),
      })
    );
    broadcastState();

    ws.on('close', () => {
      broadcastState();
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string };
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', serverNow: Date.now() }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  // Periodic expiration check for called turn (every 5s)
  setInterval(() => {
    const now = Date.now();
    const hadExpiredCall = db.office.queue.some(
      (q) => q.status === 'called' && q.expiresAt !== null && q.expiresAt <= now
    );
    if (hadExpiredCall) {
      commitOfficeState(promoteNextEligible(db.office, now));
    }
  }, 5000);

  // Public demo accounts directory (names/emails only, never passwords)
  app.get('/api/auth/demo-accounts', (_req, res) => {
    res.json({
      accounts: db.users.slice(0, 4).map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        department: u.department,
      })),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const body = req.body as {
      displayName?: string;
      email?: string;
      department?: string;
      password?: string;
      isAnonymous?: boolean;
    };
    const check = validateRegistrationInput({
      displayName: String(body.displayName ?? ''),
      email: String(body.email ?? ''),
      department: String(body.department ?? 'Umum'),
      password: String(body.password ?? ''),
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }
    const existing = db.users.find((u) => u.email.toLowerCase() === check.email);
    if (existing) {
      res.status(400).json({ error: 'Email tersebut sudah terdaftar. Silakan masuk.' });
      return;
    }

    const { hash, salt } = hashPassword(check.password);
    const now = Date.now();
    const newUser: StoredUserRecord = {
      id: `emp-${now}-${crypto.randomBytes(3).toString('hex')}`,
      email: check.email,
      displayName: check.name,
      department: check.department,
      isAnonymous: Boolean(body.isAnonymous),
      createdAt: now,
      passwordHash: hash,
      passwordSalt: salt,
    };
    db.users.push(newUser);
    persistDatabase(db);

    const token = createSessionToken(newUser.id, db.authSecret);
    res.status(201).json({
      token,
      user: toPublicUser(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Email atau password tidak sesuai.' });
      return;
    }

    const token = createSessionToken(user.id, db.authSecret);
    res.json({
      token,
      user: toPublicUser(user),
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const body = req.body as {
      displayName?: string;
      department?: string;
      isAnonymous?: boolean;
    };
    const check = validateEmployeeInput(
      String(body.displayName ?? user.displayName),
      String(body.department ?? user.department)
    );
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    user.displayName = check.name;
    user.department = check.department;
    if (typeof body.isAnonymous === 'boolean') {
      user.isAnonymous = body.isAnonymous;
    }

    // Keep live toilet occupant / queue display metadata synced with updated profile
    if (db.office.toilet.occupant?.userId === user.id) {
      db.office.toilet.occupant.displayName = user.displayName;
      db.office.toilet.occupant.department = user.department;
      db.office.toilet.occupant.isAnonymous = user.isAnonymous;
    }
    if (db.office.toilet.reservedFor?.userId === user.id) {
      db.office.toilet.reservedFor.displayName = user.displayName;
      db.office.toilet.reservedFor.department = user.department;
      db.office.toilet.reservedFor.isAnonymous = user.isAnonymous;
    }
    db.office.queue = db.office.queue.map((q) =>
      q.userId === user.id
        ? {
            ...q,
            displayName: user.displayName,
            department: user.department,
            isAnonymous: user.isAnonymous,
          }
        : q
    );

    persistDatabase(db);
    broadcastState();
    res.json({ user: toPublicUser(user) });
  });

  app.get('/api/state', (_req, res) => {
    const now = Date.now();
    const promoted = promoteNextEligible(db.office, now);
    if (promoted.queue.length !== db.office.queue.length) {
      db.office = promoted;
      persistDatabase(db);
    }
    res.json(getPublicState());
  });

  app.post('/api/occupy', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const body = req.body as { need?: NeedType };
    const result = occupyStall(
      db.office,
      {
        userId: user.id,
        displayName: user.displayName,
        department: user.department,
        isAnonymous: user.isAnonymous,
        need: body.need === 'cepat' ? 'cepat' : 'pup',
      },
      Date.now()
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/release', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const body = req.body as { force?: boolean };
    const result = releaseStall(
      db.office,
      {
        userId: user.id,
        force: Boolean(body.force),
      },
      Date.now()
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/queue/join', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const body = req.body as { need?: NeedType };
    const result = joinQueue(
      db.office,
      {
        userId: user.id,
        displayName: user.displayName,
        department: user.department,
        isAnonymous: user.isAnonymous,
        need: body.need === 'cepat' ? 'cepat' : 'pup',
      },
      Date.now()
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/queue/leave', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const result = leaveQueue(db.office, user.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/toilet/maintenance', requireAuth, (_req, res) => {
    const result = toggleStallMaintenance(db.office, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/reset-demo', (_req, res) => {
    const now = Date.now();
    // Preserve any newly registered users while restoring seed accounts and fresh 1-toilet state
    const seedUsers = createSeedUsers(now);
    const seedIds = new Set(seedUsers.map((u) => u.id));
    db.users = [...seedUsers, ...db.users.filter((u) => !seedIds.has(u.id))];
    commitOfficeState(createSeedState(now));
    res.json(getPublicState());
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.join(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Ngising server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
