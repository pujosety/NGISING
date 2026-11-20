import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  MYSQL_SCHEMA_STATEMENTS,
  getMySqlConfigFromEnv,
  rowToGuestbookEntry,
  rowToHistoryItem,
  rowToQueueEntry,
  rowToToilet,
  rowToUser,
} from './dbSchema.ts';
import { verifyPassword } from './auth.ts';

test('getMySqlConfigFromEnv parses Wasmer env variables and SSL defaults cleanly', () => {
  assert.equal(getMySqlConfigFromEnv({}), null);

  const remote = getMySqlConfigFromEnv({
    DB_HOST: 'db.fr-roub1.bengt.wasmernet.com',
    DB_PORT: '20184',
    DB_NAME: 'Ngising',
    DB_USERNAME: 'user_test',
    DB_PASSWORD: 'secret',
  });
  assert.deepEqual(remote, {
    host: 'db.fr-roub1.bengt.wasmernet.com',
    port: 20184,
    database: 'Ngising',
    user: 'user_test',
    password: 'secret',
    useSsl: true,
  });

  const localNoSsl = getMySqlConfigFromEnv({
    DB_HOST: 'localhost',
    DB_NAME: 'Ngising',
    DB_USERNAME: 'root',
  });
  assert.equal(localNoSsl?.port, 3306);
  assert.equal(localNoSsl?.useSsl, false);
});

test('SQL row mappers reconstruct Ngising domain objects accurately', () => {
  const user = rowToUser({
    id: 'emp-admin',
    email: 'pujo@kantor.id',
    display_name: 'pujo',
    department: 'Operasional',
    role: 'admin',
    is_anonymous: 0,
    created_at: '1700000000000',
    password_hash: 'abc',
    password_salt: 'def',
  });
  assert.equal(user.displayName, 'pujo');
  assert.equal(user.role, 'admin');
  assert.equal(user.isAnonymous, false);

  const toilet = rowToToilet({
    id: 'toilet-utama',
    name: 'Toilet Kantor',
    location: 'Area Belakang',
    status: 'occupied',
    occupant_json: JSON.stringify({
      userId: 'emp-dimas',
      displayName: 'Dimas',
      department: 'Eng',
      isAnonymous: false,
      need: 'pup',
      startedAt: 1700000000000,
    }),
    reserved_for_json: null,
  });
  assert.equal(toilet.occupant?.userId, 'emp-dimas');
  assert.equal(toilet.reservedFor, null);

  const queue = rowToQueueEntry({
    id: 'q1',
    position: 0,
    user_id: 'guest-1',
    display_name: 'Budi',
    department: 'Tamu · PT Maju',
    is_anonymous: 0,
    is_guest: 1,
    need: 'cepat',
    joined_at: '1700000001000',
    status: 'waiting',
    called_stall_id: null,
    called_at: null,
    expires_at: null,
  });
  assert.equal(queue.isGuest, true);
  assert.equal(queue.need, 'cepat');

  const hist = rowToHistoryItem({
    id: 'h1',
    stall_id: 'toilet-utama',
    stall_name: 'Toilet Kantor',
    user_id: 'emp-siti',
    display_name: 'Siti',
    department: 'Design',
    is_anonymous: 0,
    is_guest: 0,
    need: 'pup',
    started_at: '1700000000000',
    ended_at: '1700000300000',
    duration_ms: '300000',
  });
  assert.equal(hist.durationMs, 300000);

  const gb = rowToGuestbookEntry({
    id: 'gb-1',
    guest_id: 'guest-1',
    guest_name: 'Hendra',
    origin: 'PT Nusantara',
    visited_at: '1700000000000',
  });
  assert.equal(gb.guestName, 'Hendra');
});

test('database/ngising.sql contains all 6 tables and valid pujo/Sukangising scrypt seed', () => {
  assert.equal(MYSQL_SCHEMA_STATEMENTS.length, 6);
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'database/ngising.sql'), 'utf-8');
  for (const tbl of [
    'app_meta',
    'users',
    'toilets',
    'toilet_queue',
    'toilet_history',
    'guestbook_entries',
  ]) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS \`${tbl}\``), `Missing table ${tbl}`);
  }
  const match = sql.match(
    /\('emp-admin',\s*'pujo@kantor\.id',\s*'pujo'.*?'([0-9a-f]{128})',\s*'([0-9a-f]{32})'\)/
  );
  assert.ok(match, 'Seed row for admin pujo not found in database/ngising.sql');
  assert.equal(verifyPassword('Sukangising', match[1], match[2]), true);
});
