import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_WINDOW_MS,
  DAILY_SESSION_LIMIT,
  clearQueue,
  computeOfficeStats,
  computePersonalStats,
  computeWeeklyLeaderboard,
  estimateWaitMinutes,
  formatDuration,
  getDailyQuota,
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
  validateGuestbookInput,
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
    guestbook: [],
    onlineCount: 2,
    serverNow: now,
  };
}

test('formatDuration and validateRegistrationInput enforce valid inputs without requiring division or email', () => {
  assert.equal(formatDuration(65_000), '01:05');
  assert.equal(
    validateRegistrationInput({
      displayName: 'A',
      password: '123',
    }).valid,
    false
  );
  const ok = validateRegistrationInput({
    displayName: ' Rina Wijaya ',
    password: 'password123',
  });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.name, 'Rina Wijaya');
    assert.equal(ok.department, '');
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

test('admin queue prioritization, removal, clearing, and toilet update work cleanly', () => {
  const now = 1_700_000_000_000;
  const base = makeSingleToiletState(now);
  const q1 = joinQueue(
    base,
    { userId: 'u1', displayName: 'Satu', department: 'Ops', isAnonymous: false, need: 'pup' },
    now + 100
  );
  assert.equal(q1.ok, true);
  if (!q1.ok) return;
  const q2 = joinQueue(
    q1.state,
    { userId: 'u2', displayName: 'Dua', department: 'Design', isAnonymous: false, need: 'cepat' },
    now + 200
  );
  assert.equal(q2.ok, true);
  if (!q2.ok) return;

  const secondId = q2.state.queue[1].id;
  const prio = prioritizeQueueEntry(q2.state, secondId, now + 300);
  assert.equal(prio.ok, true);
  if (!prio.ok) return;
  assert.equal(prio.state.queue[0].userId, 'u2');

  const rem = removeQueueEntry(prio.state, prio.state.queue[0].id, now + 400);
  assert.equal(rem.ok, true);
  if (!rem.ok) return;
  assert.equal(rem.state.queue.length, 1);

  const cleared = clearQueue(rem.state, now + 500);
  assert.equal(cleared.queue.length, 0);

  const renamed = updateToiletInfo(
    cleared,
    { name: 'Toilet Utama Lantai 2', location: 'Dekat Pantry' },
    now + 600
  );
  assert.equal(renamed.ok, true);
  if (renamed.ok) {
    assert.equal(renamed.state.toilet.name, 'Toilet Utama Lantai 2');
    assert.equal(renamed.state.toilet.location, 'Dekat Pantry');
  }

  const withHistory = {
    ...cleared,
    history: [
      {
        id: 'hist-x',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'u1',
        displayName: 'Satu',
        department: '',
        isAnonymous: false,
        need: 'pup' as const,
        startedAt: now - 10_000,
        endedAt: now,
        durationMs: 10_000,
      },
    ],
  };
  const removedHist = removeHistoryEntry(withHistory, 'hist-x', now + 700);
  assert.equal(removedHist.ok, true);
  if (removedHist.ok) {
    assert.equal(removedHist.state.history.length, 0);
  }
});

test('guestbook validation and guest queue/toilet flow work without account login', () => {
  assert.equal(validateGuestbookInput({ guestName: 'A', origin: 'PT Maju' }).valid, false);
  assert.equal(validateGuestbookInput({ guestName: 'Budi', origin: '' }).valid, false);
  const validGuest = validateGuestbookInput({
    guestName: ' Budi Santoso ',
    origin: ' PT Maju Jaya · Klien ',
  });
  assert.equal(validGuest.valid, true);
  if (!validGuest.valid) return;

  const now = 1_700_000_000_000;
  const base = makeSingleToiletState(now);
  base.guestbook = [
    {
      id: 'gb-1',
      guestId: 'guest-1',
      guestName: validGuest.guestName,
      origin: validGuest.origin,
      visitedAt: now,
    },
  ];

  const queued = joinQueue(
    base,
    {
      userId: 'guest-1',
      displayName: validGuest.guestName,
      department: `Tamu · ${validGuest.origin}`,
      isAnonymous: false,
      isGuest: true,
      need: 'cepat',
    },
    now + 100
  );
  assert.equal(queued.ok, true);
  if (!queued.ok) return;
  assert.equal(queued.state.queue[0].isGuest, true);

  const removedGb = removeGuestbookEntry(queued.state, 'gb-1', now + 200);
  assert.equal(removedGb.ok, true);
  if (removedGb.ok) {
    assert.equal(removedGb.state.guestbook.length, 0);
  }
});

test('daily ngising quota enforces max 10x per day across occupy and queue', () => {
  const now = new Date(2026, 10, 19, 14, 0, 0).getTime();
  const base = makeSingleToiletState(now);
  // Free the stall first
  const freed = releaseStall(base, { userId: 'emp-dimas' }, now - 60_000);
  assert.equal(freed.ok, true);
  if (!freed.ok) return;

  // Give Siti 9 sessions today + 2 sessions yesterday (yesterday must NOT count toward today)
  const historyToday = Array.from({ length: 9 }, (_, i) => ({
    id: `today-${i}`,
    stallId: 'toilet-utama',
    stallName: 'Toilet Kantor',
    userId: 'emp-siti',
    displayName: 'Siti Rahma',
    department: 'Design',
    isAnonymous: false,
    need: 'pup' as const,
    startedAt: now - (i + 1) * 180_000,
    endedAt: now - (i + 1) * 180_000 + 60_000,
    durationMs: 60_000,
  }));
  const historyYesterday = Array.from({ length: 2 }, (_, i) => ({
    id: `yday-${i}`,
    stallId: 'toilet-utama',
    stallName: 'Toilet Kantor',
    userId: 'emp-siti',
    displayName: 'Siti Rahma',
    department: 'Design',
    isAnonymous: false,
    need: 'pup' as const,
    startedAt: now - 86_400_000 - i * 60_000,
    endedAt: now - 86_400_000 - i * 60_000 + 30_000,
    durationMs: 30_000,
  }));

  const stateWithNine = {
    ...freed.state,
    history: [...historyToday, ...historyYesterday],
  };

  assert.equal(DAILY_SESSION_LIMIT, 10);
  const quotaBefore = getDailyQuota(stateWithNine, 'emp-siti', now);
  assert.equal(quotaBefore.used, 9);
  assert.equal(quotaBefore.remaining, 1);

  // 10th session succeeds
  const tenthOccupy = occupyStall(
    stateWithNine,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'pup',
    },
    now
  );
  assert.equal(tenthOccupy.ok, true);
  if (!tenthOccupy.ok) return;

  const tenthRelease = releaseStall(tenthOccupy.state, { userId: 'emp-siti' }, now + 30_000);
  assert.equal(tenthRelease.ok, true);
  if (!tenthRelease.ok) return;

  const quotaAfter = getDailyQuota(tenthRelease.state, 'emp-siti', now + 31_000);
  assert.equal(quotaAfter.used, 10);
  assert.equal(quotaAfter.remaining, 0);

  // 11th attempt (occupy and joinQueue) must be blocked
  const eleventhOccupy = occupyStall(
    tenthRelease.state,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'cepat',
    },
    now + 32_000
  );
  assert.equal(eleventhOccupy.ok, false);

  const eleventhQueue = joinQueue(
    tenthRelease.state,
    {
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'pup',
    },
    now + 32_000
  );
  assert.equal(eleventhQueue.ok, false);
});

test('computeWeeklyLeaderboard aggregates last 7 days by session count and excludes older records', () => {
  const now = new Date(2026, 10, 19, 14, 0, 0).getTime();
  const day = 86_400_000;
  const history = [
    // Dimas: 3 sessions within last 7 days
    {
      id: 'w1',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-dimas',
      displayName: 'Dimas Pratama',
      department: 'Engineering',
      isAnonymous: false,
      need: 'pup' as const,
      startedAt: now - 10_000,
      endedAt: now,
      durationMs: 300_000,
    },
    {
      id: 'w2',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-dimas',
      displayName: 'Dimas Pratama',
      department: 'Engineering',
      isAnonymous: false,
      need: 'pup' as const,
      startedAt: now - 2 * day,
      endedAt: now - 2 * day + 240_000,
      durationMs: 240_000,
    },
    {
      id: 'w3',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-dimas',
      displayName: 'Dimas Pratama',
      department: 'Engineering',
      isAnonymous: false,
      need: 'cepat' as const,
      startedAt: now - 4 * day,
      endedAt: now - 4 * day + 120_000,
      durationMs: 120_000,
    },
    // Siti: 1 session within 7 days, plus 5 sessions 12 days ago (excluded)
    {
      id: 'w4',
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'pup' as const,
      startedAt: now - 1 * day,
      endedAt: now - 1 * day + 600_000,
      durationMs: 600_000,
    },
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `old-${i}`,
      stallId: 'toilet-utama',
      stallName: 'Toilet Kantor',
      userId: 'emp-siti',
      displayName: 'Siti Rahma',
      department: 'Design',
      isAnonymous: false,
      need: 'pup' as const,
      startedAt: now - 12 * day - i * 60_000,
      endedAt: now - 12 * day - i * 60_000 + 180_000,
      durationMs: 180_000,
    })),
  ];

  const weekly = computeWeeklyLeaderboard(history, now);
  assert.equal(weekly.totalSessions, 4);
  assert.equal(weekly.entries[0].userId, 'emp-dimas');
  assert.equal(weekly.entries[0].totalSessions, 3);
  assert.equal(weekly.entries[1].userId, 'emp-siti');
  assert.equal(weekly.entries[1].totalSessions, 1);

  const office = computeOfficeStats(history, now);
  assert.equal(office.weeklyLeaderboard[0].userId, 'emp-dimas');
});
