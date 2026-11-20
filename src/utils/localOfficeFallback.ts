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
} from '../shared/queueLogic.ts';
import type {
  GuestbookEntry,
  GuestSession,
  NeedType,
  OfficeState,
  UserAccount,
  UserRole,
} from '../shared/types.ts';

const LOCAL_DB_KEY = 'ngising_local_db_v1';
const LOCAL_CHANNEL_NAME = 'ngising_local_sync_v1';

interface LocalUserRecord extends UserAccount {
  password: string;
}

interface LocalDatabase {
  users: LocalUserRecord[];
  office: OfficeState;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getMemoryFallbackStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const memoryStorage = getMemoryFallbackStorage();

function resolveStorage(customStorage?: StorageLike): StorageLike {
  if (customStorage) return customStorage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore storage access failure
  }
  return memoryStorage;
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPublicUser(u: LocalUserRecord): UserAccount {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    department: u.department,
    role: u.role,
    isAnonymous: u.isAnonymous,
    createdAt: u.createdAt,
  };
}

function createInitialLocalDatabase(now = Date.now()): LocalDatabase {
  const min = 60_000;
  const hour = 60 * min;
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const midnightMs = todayMidnight.getTime();

  const relPast = (hoursAgo: number, minutesAgo: number, durationMin: number) => {
    const end = Math.max(midnightMs + 10 * min, now - hoursAgo * hour - minutesAgo * min);
    const start = Math.max(midnightMs + 2 * min, end - durationMin * min);
    return {
      startedAt: start,
      endedAt: end,
      durationMs: Math.max(durationMin * min, end - start),
    };
  };

  const makeUser = (
    id: string,
    email: string,
    displayName: string,
    department: string,
    role: UserRole
  ): LocalUserRecord => ({
    id,
    email,
    displayName,
    department,
    role,
    isAnonymous: false,
    createdAt: now - 86_400_000,
    password: 'ngising123',
  });

  const users: LocalUserRecord[] = [
    makeUser('emp-admin', 'admin@kantor.id', 'Admin Kantor', 'Operasional', 'admin'),
    makeUser('emp-siti', 'siti@kantor.id', 'Siti Rahma', 'Design', 'employee'),
    makeUser('emp-dimas', 'dimas@kantor.id', 'Dimas Pratama', 'Engineering', 'employee'),
    makeUser('emp-bagus', 'bagus@kantor.id', 'Bagus Saputra', 'Product', 'employee'),
    makeUser('emp-eko', 'eko@kantor.id', 'Eko Nugroho', 'Operations', 'employee'),
  ];

  const day = 24 * hour;
  const relDaysAgo = (daysAgo: number, hourOfDay: number, durationMin: number) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(hourOfDay, 15, 0, 0);
    const start = d.getTime();
    return {
      startedAt: start,
      endedAt: start + durationMin * min,
      durationMs: durationMin * min,
    };
  };

  const office: OfficeState = {
    toilet: {
      id: 'toilet-utama',
      name: 'Toilet Kantor',
      location: 'Area Belakang',
      status: 'occupied',
      occupant: {
        userId: 'emp-dimas',
        displayName: 'Dimas Pratama',
        department: 'Engineering',
        isAnonymous: false,
        need: 'pup',
        startedAt: now - 4 * min - 22_000,
      },
      reservedFor: null,
    },
    queue: [
      {
        id: 'q-seed-1',
        userId: 'emp-bagus',
        displayName: 'Bagus Saputra',
        department: 'Product',
        isAnonymous: false,
        need: 'pup',
        joinedAt: now - 2 * min - 15_000,
        status: 'waiting',
        calledStallId: null,
        calledAt: null,
        expiresAt: null,
      },
    ],
    history: [
      {
        id: 'hist-seed-4',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-siti',
        displayName: 'Siti Rahma',
        department: 'Design',
        isAnonymous: false,
        need: 'pup',
        ...relPast(0, 35, 7),
      },
      {
        id: 'hist-seed-3',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-eko',
        displayName: 'Eko Nugroho',
        department: 'Operations',
        isAnonymous: false,
        need: 'pup',
        ...relPast(1, 25, 9),
      },
      {
        id: 'hist-seed-2',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-bagus',
        displayName: 'Bagus Saputra',
        department: 'Product',
        isAnonymous: false,
        need: 'cepat',
        ...relPast(2, 10, 2),
      },
      {
        id: 'hist-seed-1',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-dimas',
        displayName: 'Dimas Pratama',
        department: 'Engineering',
        isAnonymous: false,
        need: 'pup',
        ...relPast(3, 15, 8),
      },
      {
        id: 'hist-week-1',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-dimas',
        displayName: 'Dimas Pratama',
        department: 'Engineering',
        isAnonymous: false,
        need: 'pup',
        ...relDaysAgo(1, 10, 12),
      },
      {
        id: 'hist-week-2',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-dimas',
        displayName: 'Dimas Pratama',
        department: 'Engineering',
        isAnonymous: false,
        need: 'pup',
        ...relDaysAgo(2, 14, 9),
      },
      {
        id: 'hist-week-3',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-eko',
        displayName: 'Eko Nugroho',
        department: 'Operations',
        isAnonymous: false,
        need: 'pup',
        ...relDaysAgo(1, 11, 10),
      },
    ],
    guestbook: [
      {
        id: 'gb-seed-1',
        guestId: 'guest-seed-1',
        guestName: 'Hendra Kusuma',
        origin: 'PT Nusantara · Meeting Klien',
        visitedAt: now - 55 * min,
      },
    ],
    onlineCount: 1,
    serverNow: now,
  };

  return { users, office };
}

function loadDb(storage?: StorageLike): LocalDatabase {
  const store = resolveStorage(storage);
  try {
    const raw = store.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (parsed && Array.isArray(parsed.users) && parsed.office?.toilet) {
        if (!Array.isArray(parsed.office.guestbook)) {
          parsed.office.guestbook = [];
        }
        parsed.office = promoteNextEligible(parsed.office, Date.now());
        return parsed;
      }
    }
  } catch {
    // ignore corrupt JSON
  }
  const fresh = createInitialLocalDatabase();
  saveDb(fresh, store);
  return fresh;
}

function saveDb(db: LocalDatabase, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  try {
    store.setItem(LOCAL_DB_KEY, JSON.stringify(db));
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      ch.postMessage({ type: 'state:sync' });
      ch.close();
    }
  } catch {
    // ignore storage errors
  }
}

function encodeLocalToken(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `local.${b64}`;
}

function decodeLocalToken(token: string): Record<string, unknown> | null {
  if (!token.startsWith('local.')) return null;
  try {
    const b64 = token.slice(6);
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function subscribeLocalChanges(onChange: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const ch = new BroadcastChannel(LOCAL_CHANNEL_NAME);
  ch.onmessage = () => onChange();
  return () => ch.close();
}

export function localGetPublicState(storage?: StorageLike): OfficeState {
  const db = loadDb(storage);
  return {
    ...db.office,
    guestbook: [],
    onlineCount: 1,
    serverNow: Date.now(),
  };
}

export function localGetDemoAccounts(storage?: StorageLike) {
  const db = loadDb(storage);
  return db.users.slice(0, 5).map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    department: u.department,
    role: u.role,
  }));
}

export function localRegister(
  params: { displayName: string; password: string },
  storage?: StorageLike
): { ok: true; token: string; user: UserAccount } | { ok: false; error: string } {
  const check = validateRegistrationInput(params);
  if (!check.valid) return { ok: false, error: check.error };

  const db = loadDb(storage);
  if (db.users.some((u) => u.displayName.toLowerCase() === check.name.toLowerCase())) {
    return {
      ok: false,
      error: 'Nama tersebut sudah terdaftar. Gunakan nama lain atau masuk ke akunmu.',
    };
  }

  const now = Date.now();
  const slug =
    check.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'user';
  const newUser: LocalUserRecord = {
    id: randomId('emp'),
    email: `${slug}.${Math.random().toString(36).slice(2, 6)}@ngising.local`,
    displayName: check.name,
    department: '',
    role: 'employee',
    isAnonymous: false,
    createdAt: now,
    password: check.password,
  };
  db.users.push(newUser);
  saveDb(db, storage);

  const token = encodeLocalToken({ type: 'user', uid: newUser.id, iat: now });
  return { ok: true, token, user: toPublicUser(newUser) };
}

export function localLogin(
  identifier: string,
  password: string,
  storage?: StorageLike
): { ok: true; token: string; user: UserAccount } | { ok: false; error: string } {
  const norm = identifier.trim().toLowerCase();
  if (!norm || !password) {
    return { ok: false, error: 'Nama dan password wajib diisi.' };
  }
  const db = loadDb(storage);
  const found = db.users.find(
    (u) => u.displayName.toLowerCase() === norm || u.email.toLowerCase() === norm
  );
  if (!found || found.password !== password) {
    return { ok: false, error: 'Nama atau password tidak sesuai.' };
  }
  const token = encodeLocalToken({ type: 'user', uid: found.id, iat: Date.now() });
  return { ok: true, token, user: toPublicUser(found) };
}

export function localGetUserByToken(token: string, storage?: StorageLike): UserAccount | null {
  const parsed = decodeLocalToken(token);
  if (!parsed || parsed.type !== 'user' || typeof parsed.uid !== 'string') return null;
  const db = loadDb(storage);
  const found = db.users.find((u) => u.id === parsed.uid);
  return found ? toPublicUser(found) : null;
}

export function localUpdateProfile(
  token: string,
  params: { displayName: string; department: string; isAnonymous: boolean },
  storage?: StorageLike
): { ok: true; user: UserAccount; state: OfficeState } | { ok: false; error: string } {
  const user = localGetUserByToken(token, storage);
  if (!user) return { ok: false, error: 'Sesi berakhir. Silakan masuk ulang.' };
  const check = validateEmployeeInput(params.displayName, params.department);
  if (!check.valid) return { ok: false, error: check.error };

  const db = loadDb(storage);
  const target = db.users.find((u) => u.id === user.id);
  if (!target) return { ok: false, error: 'Akun tidak ditemukan.' };
  target.displayName = check.name;
  target.department = check.department;
  target.isAnonymous = Boolean(params.isAnonymous);

  if (db.office.toilet.occupant?.userId === target.id) {
    db.office.toilet.occupant.displayName = target.displayName;
    db.office.toilet.occupant.department = target.department;
    db.office.toilet.occupant.isAnonymous = target.isAnonymous;
  }
  if (db.office.toilet.reservedFor?.userId === target.id) {
    db.office.toilet.reservedFor.displayName = target.displayName;
    db.office.toilet.reservedFor.department = target.department;
    db.office.toilet.reservedFor.isAnonymous = target.isAnonymous;
  }
  db.office.queue = db.office.queue.map((q) =>
    q.userId === target.id
      ? {
          ...q,
          displayName: target.displayName,
          department: target.department,
          isAnonymous: target.isAnonymous,
        }
      : q
  );
  saveDb(db, storage);
  return { ok: true, user: toPublicUser(target), state: localGetPublicState(storage) };
}

export function localGuestCheckIn(
  params: { guestName: string; origin: string },
  storage?: StorageLike
):
  | { ok: true; token: string; guest: GuestSession; state: OfficeState }
  | { ok: false; error: string } {
  const check = validateGuestbookInput(params);
  if (!check.valid) return { ok: false, error: check.error };

  const db = loadDb(storage);
  const now = Date.now();
  const guestId = randomId('guest');
  const entry: GuestbookEntry = {
    id: randomId('gb'),
    guestId,
    guestName: check.guestName,
    origin: check.origin,
    visitedAt: now,
  };
  const guest: GuestSession = {
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
  saveDb(db, storage);

  const token = encodeLocalToken({
    type: 'guest',
    gid: guest.id,
    name: guest.displayName,
    origin: guest.origin,
    iat: guest.checkedInAt,
  });
  return { ok: true, token, guest, state: localGetPublicState(storage) };
}

export function localGetGuestByToken(token: string): GuestSession | null {
  const parsed = decodeLocalToken(token);
  if (
    !parsed ||
    parsed.type !== 'guest' ||
    typeof parsed.gid !== 'string' ||
    typeof parsed.name !== 'string' ||
    typeof parsed.origin !== 'string'
  ) {
    return null;
  }
  return {
    id: parsed.gid,
    displayName: parsed.name,
    origin: parsed.origin,
    checkedInAt: typeof parsed.iat === 'number' ? parsed.iat : Date.now(),
  };
}

interface LocalActor {
  id: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isAdmin: boolean;
  isGuest: boolean;
}

function resolveActor(token: string, storage?: StorageLike): LocalActor | null {
  const user = localGetUserByToken(token, storage);
  if (user) {
    return {
      id: user.id,
      displayName: user.displayName,
      department: user.department,
      isAnonymous: user.isAnonymous,
      isAdmin: user.role === 'admin',
      isGuest: false,
    };
  }
  const guest = localGetGuestByToken(token);
  if (guest) {
    return {
      id: guest.id,
      displayName: guest.displayName,
      department: `Tamu · ${guest.origin}`,
      isAnonymous: false,
      isAdmin: false,
      isGuest: true,
    };
  }
  return null;
}

export function localMutateActor(
  token: string,
  action: 'occupy' | 'release' | 'join' | 'leave',
  params: { need?: NeedType; force?: boolean } = {},
  storage?: StorageLike
): { ok: true; state: OfficeState } | { ok: false; error: string; status?: number } {
  const actor = resolveActor(token, storage);
  if (!actor) {
    return {
      ok: false,
      status: 401,
      error: 'Sesi tidak valid. Silakan masuk akun atau isi Buku Tamu.',
    };
  }
  const db = loadDb(storage);
  const now = Date.now();
  let result: { ok: true; state: OfficeState } | { ok: false; error: string };

  if (action === 'occupy') {
    result = occupyStall(
      db.office,
      {
        userId: actor.id,
        displayName: actor.displayName,
        department: actor.department,
        isAnonymous: actor.isAnonymous,
        isGuest: actor.isGuest,
        need: params.need === 'cepat' ? 'cepat' : 'pup',
      },
      now
    );
  } else if (action === 'release') {
    result = releaseStall(
      db.office,
      { userId: actor.id, force: Boolean(params.force) && actor.isAdmin },
      now
    );
  } else if (action === 'join') {
    result = joinQueue(
      db.office,
      {
        userId: actor.id,
        displayName: actor.displayName,
        department: actor.department,
        isAnonymous: actor.isAnonymous,
        isGuest: actor.isGuest,
        need: params.need === 'cepat' ? 'cepat' : 'pup',
      },
      now
    );
  } else {
    result = leaveQueue(db.office, actor.id, now);
  }

  if (!result.ok) return result;
  db.office = result.state;
  saveDb(db, storage);
  return { ok: true, state: localGetPublicState(storage) };
}

function buildLocalAdminUsers(db: LocalDatabase) {
  return db.users.map((u) => ({
    ...toPublicUser(u),
    sessionCount: db.office.history.filter((h) => h.userId === u.id).length,
  }));
}

export function localGetAdminData(token: string, storage?: StorageLike) {
  const user = localGetUserByToken(token, storage);
  if (!user || user.role !== 'admin') return null;
  const db = loadDb(storage);
  return {
    users: buildLocalAdminUsers(db),
    guestbook: db.office.guestbook,
  };
}

export function localAdminAction(
  token: string,
  op:
    | { type: 'updateToilet'; name: string; location: string }
    | { type: 'toggleMaintenance' }
    | { type: 'forceRelease' }
    | { type: 'prioritizeQueue'; queueId: string }
    | { type: 'removeQueue'; queueId: string }
    | { type: 'clearQueue' }
    | { type: 'deleteHistory'; historyId: string }
    | { type: 'deleteGuestbook'; entryId: string }
    | { type: 'updateUserRole'; userId: string; role: UserRole }
    | { type: 'resetPassword'; userId: string; password?: string }
    | { type: 'deleteUser'; userId: string }
    | { type: 'resetDemo' },
  storage?: StorageLike
):
  | {
      ok: true;
      state?: OfficeState;
      users?: ReturnType<typeof buildLocalAdminUsers>;
      guestbook?: GuestbookEntry[];
      message?: string;
    }
  | { ok: false; error: string } {
  const admin = localGetUserByToken(token, storage);
  if (!admin || admin.role !== 'admin') {
    return { ok: false, error: 'Akses khusus Admin Kantor.' };
  }

  const db = loadDb(storage);
  const now = Date.now();

  switch (op.type) {
    case 'updateToilet': {
      const r = updateToiletInfo(db.office, { name: op.name, location: op.location }, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'toggleMaintenance': {
      const r = toggleStallMaintenance(db.office, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'forceRelease': {
      const r = releaseStall(db.office, { userId: admin.id, force: true }, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'prioritizeQueue': {
      const r = prioritizeQueueEntry(db.office, op.queueId, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'removeQueue': {
      const r = removeQueueEntry(db.office, op.queueId, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'clearQueue': {
      db.office = clearQueue(db.office, now);
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'deleteHistory': {
      const r = removeHistoryEntry(db.office, op.historyId, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, state: localGetPublicState(storage) };
    }
    case 'deleteGuestbook': {
      const r = removeGuestbookEntry(db.office, op.entryId, now);
      if (!r.ok) return r;
      db.office = r.state;
      saveDb(db, storage);
      return { ok: true, guestbook: db.office.guestbook, state: localGetPublicState(storage) };
    }
    case 'updateUserRole': {
      if (op.userId === admin.id && op.role !== 'admin') {
        return { ok: false, error: 'Tidak dapat menurunkan peran akun admin yang sedang kamu pakai.' };
      }
      const target = db.users.find((u) => u.id === op.userId);
      if (!target) return { ok: false, error: 'Akun karyawan tidak ditemukan.' };
      const adminCount = db.users.filter((u) => u.role === 'admin').length;
      if (target.role === 'admin' && op.role !== 'admin' && adminCount <= 1) {
        return { ok: false, error: 'Minimal harus ada satu akun Admin aktif.' };
      }
      target.role = op.role;
      saveDb(db, storage);
      return { ok: true, users: buildLocalAdminUsers(db) };
    }
    case 'resetPassword': {
      const nextPwd = op.password ?? 'ngising123';
      if (nextPwd.length < 4) return { ok: false, error: 'Password baru minimal 4 karakter.' };
      const target = db.users.find((u) => u.id === op.userId);
      if (!target) return { ok: false, error: 'Akun karyawan tidak ditemukan.' };
      target.password = nextPwd;
      saveDb(db, storage);
      return {
        ok: true,
        message: `Password untuk ${target.displayName} direset menjadi "${nextPwd}".`,
      };
    }
    case 'deleteUser': {
      if (op.userId === admin.id) {
        return { ok: false, error: 'Tidak dapat menghapus akunmu sendiri saat sedang masuk.' };
      }
      const target = db.users.find((u) => u.id === op.userId);
      if (!target) return { ok: false, error: 'Akun karyawan tidak ditemukan.' };
      if (db.office.toilet.occupant?.userId === op.userId) {
        const rel = releaseStall(db.office, { userId: op.userId, force: true }, now);
        if (rel.ok) db.office = rel.state;
      }
      const q = db.office.queue.find((item) => item.userId === op.userId);
      if (q) {
        const rem = removeQueueEntry(db.office, q.id, now);
        if (rem.ok) db.office = rem.state;
      }
      db.users = db.users.filter((u) => u.id !== op.userId);
      saveDb(db, storage);
      return { ok: true, users: buildLocalAdminUsers(db), state: localGetPublicState(storage) };
    }
    case 'resetDemo': {
      const fresh = createInitialLocalDatabase(now);
      const seedIds = new Set(fresh.users.map((u) => u.id));
      db.users = [...fresh.users, ...db.users.filter((u) => !seedIds.has(u.id))];
      db.office = fresh.office;
      saveDb(db, storage);
      return {
        ok: true,
        users: buildLocalAdminUsers(db),
        guestbook: db.office.guestbook,
        state: localGetPublicState(storage),
      };
    }
  }
}
