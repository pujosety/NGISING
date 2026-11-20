import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_WINDOW_MS,
  computeOfficeStats,
  computePersonalStats,
  estimateWaitMinutes,
  formatDuration,
  joinQueue,
  leaveQueue,
  occupyStall,
  promoteNextEligible,
  releaseStall,
  toggleStallMaintenance,
  validateRegistrationInput,
} from './queueLogic.ts';
import type { OfficeState } from './types.ts';

function makeSingleToiletState(now = 1_700_000_000_000): OfficeState {
  return {
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
        startedAt: now - 5 * 60_000,
      },
      reservedFor: null,
    },
    queue: [],
    history: [],
    onlineCount: 2,
    serverNow: now,
  };
}

test('formatDuration and validateRegistrationInput enforce valid inputs', () => {
  assert.equal(formatDuration(65_000), '01:05');
  assert.equal(
    validateRegistrationInput({
      displayName: 'A',
      email: 'bad',
      department: 'Engineering',
      password: '123',
    }).valid,
    false
  );
  const ok = validateRegistrationInput({
    displayName: ' Siti Rahma ',
    email: 'SITI@kantor.id ',
    department: 'Design',
    password: 'password123',
  });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.email, 'siti@kantor.id');
    assert.equal(ok.name, 'Siti Rahma');
  }
});

test('single toilet occupy, queue, release, and auto-promotion work end-to-end', () => {
  const now = 1_700_000_000_000;
  const state = makeSingleToiletState(now);

  // Siti cannot occupy while Dimas is inside
  const blocked = occupyStall(
    state,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'cepat',
    },
    now
  );
  assert.equal(blocked.ok, false);

  // Siti joins queue #1
  const queued = joinQueue(
    state,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'cepat',
    },
    now + 1000
  );
  assert.equal(queued.ok, true);
  if (!queued.ok) return;
  assert.equal(queued.state.queue[0].status, 'waiting');

  const waitMins = estimateWaitMinutes(
    queued.state.toilet,
    queued.state.queue,
    queued.state.history,
    0,
    now + 1000
  );
  assert.ok(waitMins >= 1);

  // Dimas finishes -> Siti is automatically called for Toilet Kantor
  const released = releaseStall(
    queued.state,
    { userId: 'emp-dimas' },
    now + 60_000
  );
  assert.equal(released.ok, true);
  if (!released.ok) return;

  assert.equal(released.state.history.length, 1);
  assert.equal(released.state.queue[0].status, 'called');
  assert.equal(released.state.toilet.reservedFor?.userId, 'emp-siti');

  // Siti claims the toilet
  const claimed = occupyStall(
    released.state,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'cepat',
    },
    now + 70_000
  );
  assert.equal(claimed.ok, true);
  if (!claimed.ok) return;
  assert.equal(claimed.state.queue.length, 0);
  assert.equal(claimed.state.toilet.occupant?.userId, 'emp-siti');

  // After release, expiration works if someone doesn't claim within CLAIM_WINDOW_MS
  const rel2 = releaseStall(claimed.state, { userId: 'emp-siti' }, now + 180_000);
  assert.equal(rel2.ok, true);
  if (!rel2.ok) return;
  const q2 = joinQueue(
    rel2.state,
    {
      userId: 'emp-bagus',
      displayName: 'Bagus',
      department: 'Product',
      isAnonymous: false,
      need: 'pup',
    },
    now + 181_000
  );
  assert.equal(q2.ok, true);
  if (!q2.ok) return;
  assert.equal(q2.state.queue[0].status, 'called');
  const expired = promoteNextEligible(q2.state, now + 181_000 + CLAIM_WINDOW_MS + 1);
  assert.equal(expired.queue.length, 0);
  assert.equal(expired.toilet.reservedFor, null);
});

test('leaveQueue and maintenance mode work on single toilet', () => {
  const now = 1_700_000_000_000;
  const base = makeSingleToiletState(now);
  const rel = releaseStall(base, { userId: 'emp-dimas' }, now + 60_000);
  assert.equal(rel.ok, true);
  if (!rel.ok) return;

  const maint = toggleStallMaintenance(rel.state, now + 61_000);
  assert.equal(maint.ok, true);
  if (!maint.ok) return;
  assert.equal(maint.state.toilet.status, 'maintenance');

  const q = joinQueue(
    maint.state,
    {
      userId: 'emp-siti',
      displayName: 'Siti',
      department: 'Design',
      isAnonymous: false,
      need: 'pup',
    },
    now + 62_000
  );
  assert.equal(q.ok, true);
  if (!q.ok) return;
  const left = leaveQueue(q.state, 'emp-siti', now + 63_000);
  assert.equal(left.ok, true);
  if (left.ok) {
    assert.equal(left.state.queue.length, 0);
  }
});

test('computePersonalStats and computeOfficeStats isolate user metrics cleanly', () => {
  const morning = new Date(2026, 10, 19, 9, 0, 0).getTime();
  const history = [
    {
      id: 'h1',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'pup' as const,
      startedAt: morning,
      endedAt: morning + 480_000,
      durationMs: 480_000,
    },
    {
      id: 'h2',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-dimas',
      displayName: 'Dimas Pratama',
      department: 'Engineering',
      isAnonymous: false,
      need: 'cepat' as const,
      startedAt: morning + 900_000,
      endedAt: morning + 1_080_000,
      durationMs: 180_000,
    },
    {
      id: 'h3',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'cepat' as const,
      startedAt: morning + 3_600_000,
      endedAt: morning + 3_720_000,
      durationMs: 120_000,
    },
  ];

  const sitiStats = computePersonalStats(history, 'emp-siti', morning + 4_000_000);
  assert.equal(sitiStats.totalSessions, 2);
  assert.equal(sitiStats.todaySessions, 2);
  assert.equal(sitiStats.pupSessions, 1);
  assert.equal(sitiStats.cepatSessions, 1);
  assert.equal(sitiStats.avgPupMs, 480_000);
  assert.equal(sitiStats.avgCepatMs, 120_000);
  assert.equal(sitiStats.totalDurationTodayMs, 600_000);

  const officeStats = computeOfficeStats(history, morning + 4_000_000);
  assert.equal(officeStats.totalToday, 3);
  assert.equal(officeStats.leaderboard.length, 2);
});
