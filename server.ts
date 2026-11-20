import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createGuestToken,
  createSessionToken,
  hashPassword,
  toPublicUser,
  verifyGuestToken,
  verifyPassword,
  verifySessionToken,
} from './src/server/auth.ts';
import { createSeedState, createSeedUsers } from './src/server/seedData.ts';
import {
  clearQueue,
  joinQueue,
  leaveQueue,
  occupyStall,
  prioritizeQueueEntry,
  promoteNextEligible,
  releaseStall,
  removeGuestbookEntry,
  removeHistoryEntry,
  removeQueueEntry,
  toggleStallMaintenance,
  updateToiletInfo,
  validateEmployeeInput,
  validateGuestbookInput,
  validateRegistrationInput,
} from './src/shared/queueLogic.ts';
import type {
  GuestbookEntry,
  NeedType,
  OfficeState,
  StoredUserRecord,
  UserRole,
} from './src/shared/types.ts';

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
        let mutated = false;
        parsed.users = parsed.users.map((u) => {
          if (!u.role) {
            mutated = true;
            return { ...u, role: u.id === 'emp-admin' ? 'admin' : 'employee' };
          }
          return u;
        });
        if (!parsed.users.some((u) => u.role === 'admin')) {
          const seedAdmin = createSeedUsers(Date.now()).find((u) => u.role === 'admin');
          if (seedAdmin) {
            parsed.users.unshift(seedAdmin);
            mutated = true;
          }
        }
        if (!Array.isArray(parsed.office.guestbook)) {
          parsed.office.guestbook = [];
          mutated = true;
        }
        parsed.office = promoteNextEligible(parsed.office, Date.now());
        if (mutated) {
          persistDatabase(parsed);
        }
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

interface ActorIdentity {
  kind: 'user' | 'guest';
  id: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isAdmin: boolean;
  isGuest: boolean;
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUserRecord;
  authActor?: ActorIdentity;
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
  req.authActor = {
    kind: 'user',
    id: user.id,
    displayName: user.displayName,
    department: user.department,
    isAnonymous: user.isAnonymous,
    isAdmin: user.role === 'admin',
    isGuest: false,
  };
  next();
}

function requireActor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Silakan masuk akun atau isi Buku Tamu terlebih dahulu.' });
    return;
  }

  const verifiedUser = verifySessionToken(token, db.authSecret);
  if (verifiedUser) {
    const user = db.users.find((u) => u.id === verifiedUser.userId);
    if (user) {
      req.authUser = user;
      req.authActor = {
        kind: 'user',
        id: user.id,
        displayName: user.displayName,
        department: user.department,
        isAnonymous: user.isAnonymous,
        isAdmin: user.role === 'admin',
        isGuest: false,
      };
      next();
      return;
    }
  }

  const verifiedGuest = verifyGuestToken(token, db.authSecret);
  if (verifiedGuest) {
    req.authActor = {
      kind: 'guest',
      id: verifiedGuest.id,
      displayName: verifiedGuest.displayName,
      department: `Tamu · ${verifiedGuest.origin}`,
      isAnonymous: false,
      isAdmin: false,
      isGuest: true,
    };
    next();
    return;
  }

  res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk akun atau isi Buku Tamu.' });
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Akses khusus Admin Kantor.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const getPublicState = (): OfficeState => ({
    ...db.office,
    guestbook: [],
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

  // Public demo accounts directory (names/roles only, never passwords)
  app.get('/api/auth/demo-accounts', (_req, res) => {
    res.json({
      accounts: db.users.slice(0, 5).map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        department: u.department,
        role: u.role || 'employee',
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
      password: String(body.password ?? ''),
      email: body.email !== undefined ? String(body.email) : undefined,
      department: body.department !== undefined ? String(body.department) : '',
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const nameTaken = db.users.some(
      (u) => u.displayName.toLowerCase() === check.name.toLowerCase()
    );
    if (nameTaken) {
      res.status(400).json({
        error: 'Nama tersebut sudah terdaftar. Gunakan nama lain atau masuk ke akunmu.',
      });
      return;
    }

    let resolvedEmail = check.email;
    if (resolvedEmail) {
      const emailTaken = db.users.some((u) => u.email.toLowerCase() === resolvedEmail);
      if (emailTaken) {
        res.status(400).json({ error: 'Email tersebut sudah terdaftar. Silakan masuk.' });
        return;
      }
    } else {
      const baseSlug =
        check.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.+|\.+$/g, '') || 'user';
      resolvedEmail = `${baseSlug}.${crypto.randomBytes(2).toString('hex')}@ngising.local`;
    }

    const { hash, salt } = hashPassword(check.password);
    const now = Date.now();
    const newUser: StoredUserRecord = {
      id: `emp-${now}-${crypto.randomBytes(3).toString('hex')}`,
      email: resolvedEmail,
      displayName: check.name,
      department: check.department,
      role: 'employee',
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
    const body = req.body as {
      identifier?: string;
      email?: string;
      displayName?: string;
      password?: string;
    };
    const identifier = String(
      body.identifier ?? body.email ?? body.displayName ?? ''
    )
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Nama dan password wajib diisi.' });
      return;
    }

    const user = db.users.find(
      (u) =>
        u.displayName.toLowerCase() === identifier ||
        u.email.toLowerCase() === identifier
    );
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Nama atau password tidak sesuai.' });
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

  // Guestbook Check-In (No account/password required, mandatory guestbook entry)
  app.post('/api/guest/checkin', (req, res) => {
    const body = req.body as { guestName?: string; origin?: string };
    const check = validateGuestbookInput({
      guestName: String(body.guestName ?? ''),
      origin: String(body.origin ?? ''),
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const now = Date.now();
    const guestId = `guest-${now}-${crypto.randomBytes(3).toString('hex')}`;
    const entry: GuestbookEntry = {
      id: `gb-${now}-${crypto.randomBytes(3).toString('hex')}`,
      guestId,
      guestName: check.guestName,
      origin: check.origin,
      visitedAt: now,
    };

    const guest = {
      id: guestId,
      displayName: check.guestName,
      origin: check.origin,
      checkedInAt: now,
    };

    db.office = {
      ...db.office,
      guestbook: [entry, ...db.office.guestbook].slice(0, 300),
      serverNow: now,
    };
    persistDatabase(db);
    broadcastState();

    const token = createGuestToken(guest, db.authSecret);
    res.status(201).json({
      token,
      guest,
    });
  });

  app.get('/api/guest/me', (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Belum mengisi buku tamu.' });
      return;
    }
    const guest = verifyGuestToken(token, db.authSecret);
    if (!guest) {
      res.status(401).json({ error: 'Sesi tamu tidak valid.' });
      return;
    }
    res.json({ guest });
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

  app.post('/api/occupy', requireActor, (req: AuthenticatedRequest, res) => {
    const actor = req.authActor!;
    const body = req.body as { need?: NeedType };
    const result = occupyStall(
      db.office,
      {
        userId: actor.id,
        displayName: actor.displayName,
        department: actor.department,
        isAnonymous: actor.isAnonymous,
        isGuest: actor.isGuest,
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

  app.post('/api/release', requireActor, (req: AuthenticatedRequest, res) => {
    const actor = req.authActor!;
    const body = req.body as { force?: boolean };
    const allowForce = Boolean(body.force) && actor.isAdmin;
    const result = releaseStall(
      db.office,
      {
        userId: actor.id,
        force: allowForce,
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

  app.post('/api/queue/join', requireActor, (req: AuthenticatedRequest, res) => {
    const actor = req.authActor!;
    const body = req.body as { need?: NeedType };
    const result = joinQueue(
      db.office,
      {
        userId: actor.id,
        displayName: actor.displayName,
        department: actor.department,
        isAnonymous: actor.isAnonymous,
        isGuest: actor.isGuest,
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

  app.post('/api/queue/leave', requireActor, (req: AuthenticatedRequest, res) => {
    const actor = req.authActor!;
    const result = leaveQueue(db.office, actor.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  // --- Admin Panel Endpoints (Strictly Admin Role) ---

  const buildAdminUsersPayload = () =>
    db.users.map((u) => ({
      ...toPublicUser(u),
      sessionCount: db.office.history.filter((h) => h.userId === u.id).length,
    }));

  app.get('/api/admin/users', requireAuth, requireAdmin, (_req, res) => {
    res.json({ users: buildAdminUsersPayload(), guestbook: db.office.guestbook });
  });

  app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const body = req.body as { role?: UserRole };
    const nextRole: UserRole = body.role === 'admin' ? 'admin' : 'employee';

    if (targetId === req.authUser!.id && nextRole !== 'admin') {
      res.status(400).json({ error: 'Tidak dapat menurunkan peran akun admin yang sedang kamu pakai.' });
      return;
    }

    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Akun karyawan tidak ditemukan.' });
      return;
    }

    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (target.role === 'admin' && nextRole !== 'admin' && adminCount <= 1) {
      res.status(400).json({ error: 'Minimal harus ada satu akun Admin aktif.' });
      return;
    }

    target.role = nextRole;
    persistDatabase(db);
    res.json({ users: buildAdminUsersPayload() });
  });

  app.post(
    '/api/admin/users/:id/reset-password',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res) => {
      const targetId = req.params.id;
      const body = req.body as { password?: string };
      const nextPassword = String(body.password ?? 'ngising123');
      if (nextPassword.length < 4) {
        res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
        return;
      }

      const target = db.users.find((u) => u.id === targetId);
      if (!target) {
        res.status(404).json({ error: 'Akun karyawan tidak ditemukan.' });
        return;
      }

      const { hash, salt } = hashPassword(nextPassword);
      target.passwordHash = hash;
      target.passwordSalt = salt;
      persistDatabase(db);
      res.json({
        ok: true,
        message: `Password untuk ${target.displayName} direset menjadi "${nextPassword}".`,
      });
    }
  );

  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    if (targetId === req.authUser!.id) {
      res.status(400).json({ error: 'Tidak dapat menghapus akunmu sendiri saat sedang masuk.' });
      return;
    }

    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'Akun karyawan tidak ditemukan.' });
      return;
    }

    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (target.role === 'admin' && adminCount <= 1) {
      res.status(400).json({ error: 'Minimal harus ada satu akun Admin aktif.' });
      return;
    }

    const now = Date.now();
    let nextOffice = db.office;
    if (nextOffice.toilet.occupant?.userId === targetId) {
      const released = releaseStall(nextOffice, { userId: targetId, force: true }, now);
      if (released.ok) nextOffice = released.state;
    }
    const queueItem = nextOffice.queue.find((q) => q.userId === targetId);
    if (queueItem) {
      const removed = removeQueueEntry(nextOffice, queueItem.id, now);
      if (removed.ok) nextOffice = removed.state;
    }

    db.users = db.users.filter((u) => u.id !== targetId);
    commitOfficeState(nextOffice);
    res.json({ users: buildAdminUsersPayload(), state: getPublicState() });
  });

  app.patch('/api/admin/toilet', requireAuth, requireAdmin, (req, res) => {
    const body = req.body as { name?: string; location?: string };
    const result = updateToiletInfo(
      db.office,
      {
        name: String(body.name ?? db.office.toilet.name),
        location: String(body.location ?? db.office.toilet.location),
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

  app.post('/api/admin/toilet/maintenance', requireAuth, requireAdmin, (_req, res) => {
    const result = toggleStallMaintenance(db.office, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/admin/toilet/force-release', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const result = releaseStall(
      db.office,
      { userId: req.authUser!.id, force: true },
      Date.now()
    );
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/admin/queue/:id/prioritize', requireAuth, requireAdmin, (req, res) => {
    const result = prioritizeQueueEntry(db.office, req.params.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.delete('/api/admin/queue/:id', requireAuth, requireAdmin, (req, res) => {
    const result = removeQueueEntry(db.office, req.params.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.post('/api/admin/queue/clear', requireAuth, requireAdmin, (_req, res) => {
    commitOfficeState(clearQueue(db.office, Date.now()));
    res.json(getPublicState());
  });

  app.delete('/api/admin/history/:id', requireAuth, requireAdmin, (req, res) => {
    const result = removeHistoryEntry(db.office, req.params.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json(getPublicState());
  });

  app.delete('/api/admin/guestbook/:id', requireAuth, requireAdmin, (req, res) => {
    const result = removeGuestbookEntry(db.office, req.params.id, Date.now());
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    commitOfficeState(result.state);
    res.json({ guestbook: db.office.guestbook, state: getPublicState() });
  });

  app.post('/api/admin/reset-demo', requireAuth, requireAdmin, (_req, res) => {
    const now = Date.now();
    const seedUsers = createSeedUsers(now);
    const seedIds = new Set(seedUsers.map((u) => u.id));
    db.users = [...seedUsers, ...db.users.filter((u) => !seedIds.has(u.id))];
    commitOfficeState(createSeedState(now));
    res.json({
      users: buildAdminUsersPayload(),
      guestbook: db.office.guestbook,
      state: getPublicState(),
    });
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
