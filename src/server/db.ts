import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { promoteNextEligible } from '../shared/queueLogic.ts';
import type { OfficeState, StoredUserRecord } from '../shared/types.ts';
import { hashPassword } from './auth.ts';
import {
  MYSQL_SCHEMA_STATEMENTS,
  getMySqlConfigFromEnv,
  rowToGuestbookEntry,
  rowToHistoryItem,
  rowToQueueEntry,
  rowToToilet,
  rowToUser,
  type GuestbookRow,
  type HistoryRow,
  type MySqlConnectionConfig,
  type QueueRow,
  type ToiletRow,
  type UserRow,
} from './dbSchema.ts';
import { createSeedState, createSeedUsers } from './seedData.ts';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'ngising-state.json');

export interface PersistedDatabase {
  authSecret: string;
  users: StoredUserRecord[];
  office: OfficeState;
}

export interface DatabaseStore {
  mode: 'mysql' | 'json';
  ping(): Promise<boolean>;
  load(): Promise<PersistedDatabase>;
  saveUsers(users: StoredUserRecord[]): Promise<void>;
  saveOffice(office: OfficeState): Promise<void>;
  saveAll(db: PersistedDatabase): Promise<void>;
}

function migrateLegacyAdmin(users: StoredUserRecord[]): {
  users: StoredUserRecord[];
  mutated: boolean;
} {
  let mutated = false;
  let next = users.map((u) => {
    if (u.id === 'emp-admin' && (u.displayName === 'Admin Kantor' || u.email === 'admin@kantor.id')) {
      const { hash, salt } = hashPassword('Sukangising');
      mutated = true;
      return {
        ...u,
        email: 'pujo@kantor.id',
        displayName: 'pujo',
        role: 'admin' as const,
        passwordHash: hash,
        passwordSalt: salt,
      };
    }
    if (!u.role) {
      mutated = true;
      return {
        ...u,
        role: u.id === 'emp-admin' ? ('admin' as const) : ('employee' as const),
      };
    }
    return u;
  });

  if (!next.some((u) => u.role === 'admin')) {
    const seedAdmin = createSeedUsers(Date.now()).find((u) => u.role === 'admin');
    if (seedAdmin) {
      next = [seedAdmin, ...next];
      mutated = true;
    }
  }

  return { users: next, mutated };
}

class JsonFileStore implements DatabaseStore {
  public readonly mode = 'json' as const;
  private cache: PersistedDatabase;

  constructor() {
    this.cache = this.loadFromDisk();
  }

  private writeToDisk(db: PersistedDatabase): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${STATE_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
      fs.renameSync(tmpFile, STATE_FILE);
    } catch (err) {
      console.error('Failed to persist JSON database:', err);
    }
  }

  private loadFromDisk(): PersistedDatabase {
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
          const migrated = migrateLegacyAdmin(parsed.users);
          let mutated = migrated.mutated;
          parsed.users = migrated.users;
          if (!Array.isArray(parsed.office.guestbook)) {
            parsed.office.guestbook = [];
            mutated = true;
          }
          parsed.office = promoteNextEligible(parsed.office, Date.now());
          if (mutated) {
            this.writeToDisk(parsed);
          }
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed if JSON is missing or corrupted
    }
    const now = Date.now();
    const fresh: PersistedDatabase = {
      authSecret: process.env.AUTH_SECRET?.trim() || crypto.randomBytes(32).toString('hex'),
      users: createSeedUsers(now),
      office: createSeedState(now),
    };
    this.writeToDisk(fresh);
    return fresh;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async load(): Promise<PersistedDatabase> {
    return this.cache;
  }

  async saveUsers(users: StoredUserRecord[]): Promise<void> {
    this.cache = { ...this.cache, users };
    this.writeToDisk(this.cache);
  }

  async saveOffice(office: OfficeState): Promise<void> {
    this.cache = { ...this.cache, office };
    this.writeToDisk(this.cache);
  }

  async saveAll(db: PersistedDatabase): Promise<void> {
    this.cache = db;
    this.writeToDisk(this.cache);
  }
}

class MySqlStore implements DatabaseStore {
  public readonly mode = 'mysql' as const;
  private pool: Pool;
  private readonly config: MySqlConnectionConfig;
  private authSecret = '';

  constructor(config: MySqlConnectionConfig) {
    this.config = config;
    this.pool = this.createPool(config.useSsl);
  }

  private createPool(useSsl: boolean): Pool {
    return mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4',
    });
  }

  async ping(): Promise<boolean> {
    await this.pool.query('SELECT 1');
    return true;
  }

  async init(): Promise<void> {
    try {
      await this.initSchemaAndSeed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isExplicitSsl =
        process.env.DB_SSL === 'true' || process.env.DB_SSL === 'false';
      if (!isExplicitSsl && this.config.useSsl && /ssl|tls|secure/i.test(msg)) {
        await this.pool.end().catch(() => {});
        this.pool = this.createPool(false);
        await this.initSchemaAndSeed();
        return;
      }
      throw err;
    }
  }

  private async initSchemaAndSeed(): Promise<void> {
    for (const stmt of MYSQL_SCHEMA_STATEMENTS) {
      await this.pool.query(stmt);
    }

    const now = Date.now();
    const envSecret = process.env.AUTH_SECRET?.trim();
    if (envSecret) {
      this.authSecret = envSecret;
      await this.pool.query(
        `INSERT INTO app_meta (meta_key, meta_value, updated_at)
         VALUES ('auth_secret', ?, ?)
         ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), updated_at = VALUES(updated_at)`,
        [envSecret, now]
      );
    } else {
      const generated = crypto.randomBytes(32).toString('hex');
      await this.pool.query(
        `INSERT IGNORE INTO app_meta (meta_key, meta_value, updated_at)
         VALUES ('auth_secret', ?, ?)`,
        [generated, now]
      );
      const [metaRows] = await this.pool.query<RowDataPacket[]>(
        `SELECT meta_value FROM app_meta WHERE meta_key = 'auth_secret' LIMIT 1`
      );
      this.authSecret =
        metaRows.length > 0 && typeof metaRows[0].meta_value === 'string' && metaRows[0].meta_value
          ? metaRows[0].meta_value
          : generated;
    }

    const [toiletRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT id FROM toilets WHERE id = 'toilet-utama' LIMIT 1`
    );
    if (toiletRows.length === 0) {
      const seedOffice = createSeedState(now);
      await this.saveOffice(seedOffice);
    }

    const [userRows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM users`);
    if (userRows.length === 0) {
      await this.saveUsers(createSeedUsers(now));
    } else {
      const parsedUsers = (userRows as unknown as UserRow[]).map(rowToUser);
      const migrated = migrateLegacyAdmin(parsedUsers);
      if (migrated.mutated) {
        await this.saveUsers(migrated.users);
      }
    }
  }

  private async runTx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  private async writeUsersTx(conn: PoolConnection, users: StoredUserRecord[]): Promise<void> {
    if (users.length === 0) {
      await conn.query(`DELETE FROM users`);
      return;
    }

    const placeholders = users.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params: unknown[] = [];
    for (const u of users) {
      params.push(
        u.id,
        u.email,
        u.displayName,
        u.department,
        u.role,
        u.isAnonymous ? 1 : 0,
        u.createdAt,
        u.passwordHash,
        u.passwordSalt
      );
    }

    await conn.query(
      `INSERT INTO users (
        id, email, display_name, department, role, is_anonymous, created_at, password_hash, password_salt
      ) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        display_name = VALUES(display_name),
        department = VALUES(department),
        role = VALUES(role),
        is_anonymous = VALUES(is_anonymous),
        password_hash = VALUES(password_hash),
        password_salt = VALUES(password_salt)`,
      params
    );

    const ids = users.map((u) => u.id);
    const idPlaceholders = ids.map(() => '?').join(', ');
    await conn.query(`DELETE FROM users WHERE id NOT IN (${idPlaceholders})`, ids);
  }

  private async writeOfficeTx(conn: PoolConnection, office: OfficeState): Promise<void> {
    const now = Date.now();
    const toilet = office.toilet;
    await conn.query(
      `INSERT INTO toilets (id, name, location, status, occupant_json, reserved_for_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         location = VALUES(location),
         status = VALUES(status),
         occupant_json = VALUES(occupant_json),
         reserved_for_json = VALUES(reserved_for_json),
         updated_at = VALUES(updated_at)`,
      [
        toilet.id,
        toilet.name,
        toilet.location,
        toilet.status,
        toilet.occupant ? JSON.stringify(toilet.occupant) : null,
        toilet.reservedFor ? JSON.stringify(toilet.reservedFor) : null,
        now,
      ]
    );

    await conn.query(`DELETE FROM toilet_queue`);
    if (office.queue.length > 0) {
      const qPlaceholders = office.queue
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ');
      const qParams: unknown[] = [];
      office.queue.forEach((entry, index) => {
        qParams.push(
          entry.id,
          index,
          entry.userId,
          entry.displayName,
          entry.department,
          entry.isAnonymous ? 1 : 0,
          entry.isGuest ? 1 : 0,
          entry.need,
          entry.joinedAt,
          entry.status,
          entry.calledStallId,
          entry.calledAt,
          entry.expiresAt
        );
      });
      await conn.query(
        `INSERT INTO toilet_queue (
          id, position, user_id, display_name, department, is_anonymous, is_guest,
          need, joined_at, status, called_stall_id, called_at, expires_at
        ) VALUES ${qPlaceholders}`,
        qParams
      );
    }

    if (office.history.length === 0) {
      await conn.query(`DELETE FROM toilet_history`);
    } else {
      const hRows = office.history.slice(0, 1000);
      const hPlaceholders = hRows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const hParams: unknown[] = [];
      for (const item of hRows) {
        hParams.push(
          item.id,
          item.stallId,
          item.stallName,
          item.userId,
          item.displayName,
          item.department,
          item.isAnonymous ? 1 : 0,
          item.isGuest ? 1 : 0,
          item.need,
          item.startedAt,
          item.endedAt,
          item.durationMs
        );
      }
      await conn.query(
        `INSERT INTO toilet_history (
          id, stall_id, stall_name, user_id, display_name, department,
          is_anonymous, is_guest, need, started_at, ended_at, duration_ms
        ) VALUES ${hPlaceholders}
        ON DUPLICATE KEY UPDATE
          stall_name = VALUES(stall_name),
          display_name = VALUES(display_name),
          department = VALUES(department)`,
        hParams
      );
      const hIds = hRows.map((h) => h.id);
      const hIdPlaceholders = hIds.map(() => '?').join(', ');
      await conn.query(`DELETE FROM toilet_history WHERE id NOT IN (${hIdPlaceholders})`, hIds);
    }

    if (office.guestbook.length === 0) {
      await conn.query(`DELETE FROM guestbook_entries`);
    } else {
      const gRows = office.guestbook.slice(0, 300);
      const gPlaceholders = gRows.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const gParams: unknown[] = [];
      for (const entry of gRows) {
        gParams.push(entry.id, entry.guestId, entry.guestName, entry.origin, entry.visitedAt);
      }
      await conn.query(
        `INSERT INTO guestbook_entries (id, guest_id, guest_name, origin, visited_at)
         VALUES ${gPlaceholders}
         ON DUPLICATE KEY UPDATE
           guest_name = VALUES(guest_name),
           origin = VALUES(origin)`,
        gParams
      );
      const gIds = gRows.map((g) => g.id);
      const gIdPlaceholders = gIds.map(() => '?').join(', ');
      await conn.query(`DELETE FROM guestbook_entries WHERE id NOT IN (${gIdPlaceholders})`, gIds);
    }
  }

  async load(): Promise<PersistedDatabase> {
    const [userRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM users ORDER BY created_at ASC`
    );
    const [toiletRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM toilets WHERE id = 'toilet-utama' LIMIT 1`
    );
    const [queueRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM toilet_queue ORDER BY position ASC, joined_at ASC`
    );
    const [historyRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM toilet_history ORDER BY started_at DESC LIMIT 1000`
    );
    const [guestbookRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM guestbook_entries ORDER BY visited_at DESC LIMIT 300`
    );

    const users = (userRows as unknown as UserRow[]).map(rowToUser);
    const toilet =
      toiletRows.length > 0
        ? rowToToilet(toiletRows[0] as unknown as ToiletRow)
        : createSeedState(Date.now()).toilet;
    const queue = (queueRows as unknown as QueueRow[]).map(rowToQueueEntry);
    const history = (historyRows as unknown as HistoryRow[]).map(rowToHistoryItem);
    const guestbook = (guestbookRows as unknown as GuestbookRow[]).map(rowToGuestbookEntry);

    const now = Date.now();
    const rawOffice: OfficeState = {
      toilet,
      queue,
      history,
      guestbook,
      onlineCount: 0,
      serverNow: now,
    };
    const promoted = promoteNextEligible(rawOffice, now);
    if (
      promoted.queue.length !== rawOffice.queue.length ||
      promoted.toilet.reservedFor?.userId !== rawOffice.toilet.reservedFor?.userId
    ) {
      await this.saveOffice(promoted);
    }

    return {
      authSecret: this.authSecret,
      users,
      office: promoted,
    };
  }

  async saveUsers(users: StoredUserRecord[]): Promise<void> {
    await this.runTx((conn) => this.writeUsersTx(conn, users));
  }

  async saveOffice(office: OfficeState): Promise<void> {
    await this.runTx((conn) => this.writeOfficeTx(conn, office));
  }

  async saveAll(db: PersistedDatabase): Promise<void> {
    await this.runTx(async (conn) => {
      await this.writeUsersTx(conn, db.users);
      await this.writeOfficeTx(conn, db.office);
    });
  }
}

export async function createDatabaseStore(): Promise<DatabaseStore> {
  const mysqlConfig = getMySqlConfigFromEnv(process.env);
  if (mysqlConfig) {
    try {
      const store = new MySqlStore(mysqlConfig);
      await store.init();
      console.log(
        `[Ngising] Connected to MySQL database "${mysqlConfig.database}" at ${mysqlConfig.host}:${mysqlConfig.port}`
      );
      return store;
    } catch (err) {
      console.error(
        '[Ngising] MySQL connection failed, falling back to local JSON store:',
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log('[Ngising] Using local JSON store (data/ngising-state.json)');
  return new JsonFileStore();
}
