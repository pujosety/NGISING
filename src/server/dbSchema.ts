import type {
  GuestbookEntry,
  HistoryEntry,
  QueueEntry,
  Stall,
  StallOccupant,
  StallReservation,
  StoredUserRecord,
} from '../shared/types.ts';

export interface MySqlConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  useSsl: boolean;
}

export function getMySqlConfigFromEnv(
  env: Record<string, string | undefined>
): MySqlConnectionConfig | null {
  const host = (env.DB_HOST ?? '').trim();
  const database = (env.DB_NAME ?? '').trim();
  const user = (env.DB_USERNAME ?? env.DB_USER ?? '').trim();
  const password = env.DB_PASSWORD ?? '';

  if (!host || !database || !user) {
    return null;
  }

  const parsedPort = Number(env.DB_PORT ?? '3306');
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? Math.trunc(parsedPort) : 3306;
  const sslFlag = (env.DB_SSL ?? 'auto').trim().toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const useSsl =
    sslFlag === 'true' || sslFlag === '1'
      ? true
      : sslFlag === 'false' || sslFlag === '0'
        ? false
        : !isLocalHost;

  return {
    host,
    port,
    database,
    user,
    password,
    useSsl,
  };
}

export const MYSQL_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    meta_key VARCHAR(64) NOT NULL,
    meta_value TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (meta_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) NOT NULL,
    email VARCHAR(191) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT '',
    role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(128) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_users_email (email),
    KEY idx_users_display_name (display_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS toilets (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    location VARCHAR(120) NOT NULL,
    status ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
    occupant_json LONGTEXT NULL,
    reserved_for_json LONGTEXT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS toilet_queue (
    id VARCHAR(64) NOT NULL,
    position INT NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    department VARCHAR(120) NOT NULL DEFAULT '',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    is_guest TINYINT(1) NOT NULL DEFAULT 0,
    need ENUM('pup', 'cepat') NOT NULL DEFAULT 'pup',
    joined_at BIGINT NOT NULL,
    status ENUM('waiting', 'called') NOT NULL DEFAULT 'waiting',
    called_stall_id VARCHAR(64) NULL,
    called_at BIGINT NULL,
    expires_at BIGINT NULL,
    PRIMARY KEY (id),
    KEY idx_queue_position (position)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS toilet_history (
    id VARCHAR(64) NOT NULL,
    stall_id VARCHAR(64) NOT NULL,
    stall_name VARCHAR(120) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    department VARCHAR(120) NOT NULL DEFAULT '',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    is_guest TINYINT(1) NOT NULL DEFAULT 0,
    need ENUM('pup', 'cepat') NOT NULL DEFAULT 'pup',
    started_at BIGINT NOT NULL,
    ended_at BIGINT NOT NULL,
    duration_ms BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_history_started (started_at),
    KEY idx_history_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS guestbook_entries (
    id VARCHAR(64) NOT NULL,
    guest_id VARCHAR(64) NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    origin VARCHAR(160) NOT NULL,
    visited_at BIGINT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_guestbook_visited (visited_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  department: string;
  role: 'admin' | 'employee';
  is_anonymous: number | boolean;
  created_at: number | string;
  password_hash: string;
  password_salt: string;
}

export interface ToiletRow {
  id: string;
  name: string;
  location: string;
  status: 'available' | 'occupied' | 'maintenance';
  occupant_json: string | StallOccupant | null;
  reserved_for_json: string | StallReservation | null;
}

export interface QueueRow {
  id: string;
  position: number;
  user_id: string;
  display_name: string;
  department: string;
  is_anonymous: number | boolean;
  is_guest: number | boolean;
  need: 'pup' | 'cepat';
  joined_at: number | string;
  status: 'waiting' | 'called';
  called_stall_id: string | null;
  called_at: number | string | null;
  expires_at: number | string | null;
}

export interface HistoryRow {
  id: string;
  stall_id: string;
  stall_name: string;
  user_id: string;
  display_name: string;
  department: string;
  is_anonymous: number | boolean;
  is_guest: number | boolean;
  need: 'pup' | 'cepat';
  started_at: number | string;
  ended_at: number | string;
  duration_ms: number | string;
}

export interface GuestbookRow {
  id: string;
  guest_id: string;
  guest_name: string;
  origin: string;
  visited_at: number | string;
}

function parseJsonColumn<T>(val: string | T | null | undefined): T | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val;
}

export function rowToUser(row: UserRow): StoredUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    department: row.department ?? '',
    role: row.role === 'admin' ? 'admin' : 'employee',
    isAnonymous: Boolean(row.is_anonymous),
    createdAt: Number(row.created_at),
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
  };
}

export function rowToToilet(row: ToiletRow): Stall {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    status: row.status,
    occupant: parseJsonColumn<StallOccupant>(row.occupant_json),
    reservedFor: parseJsonColumn<StallReservation>(row.reserved_for_json),
  };
}

export function rowToQueueEntry(row: QueueRow): QueueEntry {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    department: row.department ?? '',
    isAnonymous: Boolean(row.is_anonymous),
    isGuest: Boolean(row.is_guest),
    need: row.need === 'cepat' ? 'cepat' : 'pup',
    joinedAt: Number(row.joined_at),
    status: row.status === 'called' ? 'called' : 'waiting',
    calledStallId: row.called_stall_id ?? null,
    calledAt: row.called_at !== null && row.called_at !== undefined ? Number(row.called_at) : null,
    expiresAt:
      row.expires_at !== null && row.expires_at !== undefined ? Number(row.expires_at) : null,
  };
}

export function rowToHistoryItem(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    stallId: row.stall_id,
    stallName: row.stall_name,
    userId: row.user_id,
    displayName: row.display_name,
    department: row.department ?? '',
    isAnonymous: Boolean(row.is_anonymous),
    isGuest: Boolean(row.is_guest),
    need: row.need === 'cepat' ? 'cepat' : 'pup',
    startedAt: Number(row.started_at),
    endedAt: Number(row.ended_at),
    durationMs: Number(row.duration_ms),
  };
}

export function rowToGuestbookEntry(row: GuestbookRow): GuestbookEntry {
  return {
    id: row.id,
    guestId: row.guest_id,
    guestName: row.guest_name,
    origin: row.origin,
    visitedAt: Number(row.visited_at),
  };
}
