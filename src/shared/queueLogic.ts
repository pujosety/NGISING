import type {
  DailyQuotaInfo,
  HistoryEntry,
  HourlyBucket,
  LeaderboardEntry,
  NeedType,
  OfficeState,
  OfficeStats,
  PersonalStats,
  QueueEntry,
  Stall,
} from './types.ts';

export const CLAIM_WINDOW_MS = 120_000;
export const DEFAULT_PUP_MS = 9 * 60 * 1000;
export const DEFAULT_CEPAT_MS = 3 * 60 * 1000;
export const OVERTIME_THRESHOLD_MS = 15 * 60 * 1000;
export const DAILY_SESSION_LIMIT = 10;
export const WEEKLY_WINDOW_DAYS = 7;

export function formatDuration(ms: number): string {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatMinutesLabel(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000));
  return `${mins} mnt`;
}

export function getPublicDisplayName(
  displayName: string,
  isAnonymous: boolean,
  userId: string
): string {
  if (!isAnonymous) {
    return displayName;
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 1000;
  }
  const code = String(Math.abs(hash)).padStart(3, '0');
  return `Rekan #${code}`;
}

export function validateEmployeeInput(
  displayName: string,
  department = ''
): { valid: true; name: string; department: string } | { valid: false; error: string } {
  const trimmedName = displayName.trim();
  if (trimmedName.length < 2) {
    return {
      valid: false,
      error: 'Nama karyawan minimal 2 karakter.',
    };
  }
  if (trimmedName.length > 40) {
    return {
      valid: false,
      error: 'Nama karyawan maksimal 40 karakter.',
    };
  }
  const trimmedDept = department.trim();
  return {
    valid: true,
    name: trimmedName,
    department: trimmedDept.slice(0, 32),
  };
}

export function validateRegistrationInput(params: {
  displayName: string;
  password: string;
  email?: string;
  department?: string;
}):
  | { valid: true; name: string; email: string; department: string; password: string }
  | { valid: false; error: string } {
  const nameCheck = validateEmployeeInput(params.displayName, params.department ?? '');
  if (!nameCheck.valid) {
    return nameCheck;
  }
  if (params.password.length < 4) {
    return { valid: false, error: 'Password minimal 4 karakter.' };
  }
  const rawEmail = (params.email ?? '').trim().toLowerCase();
  return {
    valid: true,
    name: nameCheck.name,
    email: rawEmail,
    department: nameCheck.department,
    password: params.password,
  };
}

export function validateGuestbookInput(params: {
  guestName: string;
  origin: string;
}):
  | { valid: true; guestName: string; origin: string }
  | { valid: false; error: string } {
  const guestName = params.guestName.trim();
  const origin = params.origin.trim();
  if (guestName.length < 2) {
    return { valid: false, error: 'Nama tamu minimal 2 karakter.' };
  }
  if (guestName.length > 40) {
    return { valid: false, error: 'Nama tamu maksimal 40 karakter.' };
  }
  if (origin.length < 2) {
    return { valid: false, error: 'Asal instansi atau keperluan kunjungan wajib diisi.' };
  }
  return {
    valid: true,
    guestName,
    origin: origin.slice(0, 60),
  };
}

export function promoteNextEligible(state: OfficeState, now: number): OfficeState {
  const toilet: Stall = {
    ...state.toilet,
    occupant: state.toilet.occupant ? { ...state.toilet.occupant } : null,
    reservedFor: state.toilet.reservedFor ? { ...state.toilet.reservedFor } : null,
  };
  let queue = state.queue.map((q) => ({ ...q }));

  // 1. Expire timed-out called reservation
  const expiredQueueIds = new Set<string>();
  if (toilet.reservedFor && toilet.reservedFor.expiresAt <= now) {
    expiredQueueIds.add(toilet.reservedFor.queueId);
    toilet.reservedFor = null;
  }
  for (const q of queue) {
    if (q.status === 'called' && q.expiresAt !== null && q.expiresAt <= now) {
      expiredQueueIds.add(q.id);
    }
  }
  if (expiredQueueIds.size > 0) {
    queue = queue.filter((q) => !expiredQueueIds.has(q.id));
  }

  // 2. If the single toilet is available and unreserved, call the #1 waiting person
  if (toilet.status === 'available' && toilet.reservedFor === null) {
    const nextIdx = queue.findIndex((q) => q.status === 'waiting');
    if (nextIdx !== -1) {
      const target = queue[nextIdx];
      const expiresAt = now + CLAIM_WINDOW_MS;
      queue[nextIdx] = {
        ...target,
        status: 'called',
        calledStallId: toilet.id,
        calledAt: now,
        expiresAt,
      };
      toilet.reservedFor = {
        queueId: target.id,
        userId: target.userId,
        displayName: target.displayName,
        department: target.department,
        isAnonymous: target.isAnonymous,
        isGuest: target.isGuest,
        need: target.need,
        calledAt: now,
        expiresAt,
      };
    }
  }

  return {
    ...state,
    toilet,
    queue,
    serverNow: now,
  };
}

export function getTodayStartMs(now: number): number {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
}

export function getDailyQuota(
  state: OfficeState,
  userId: string,
  now: number
): DailyQuotaInfo {
  const todayStartMs = getTodayStartMs(now);
  const completedToday = state.history.filter(
    (h) => h.userId === userId && h.startedAt >= todayStartMs
  ).length;
  const activeToday =
    state.toilet.status === 'occupied' &&
    state.toilet.occupant?.userId === userId &&
    state.toilet.occupant.startedAt >= todayStartMs
      ? 1
      : 0;
  const used = completedToday + activeToday;
  return {
    used,
    limit: DAILY_SESSION_LIMIT,
    remaining: Math.max(0, DAILY_SESSION_LIMIT - used),
  };
}

export function occupyStall(
  state: OfficeState,
  params: {
    userId: string;
    displayName: string;
    department: string;
    isAnonymous: boolean;
    isGuest?: boolean;
    need: NeedType;
  },
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const checked = validateEmployeeInput(params.displayName, params.department);
  if (!checked.valid) {
    return { ok: false, error: checked.error };
  }

  const toilet = state.toilet;
  if (toilet.status === 'maintenance') {
    return { ok: false, error: `${toilet.name} sedang dalam perawatan.` };
  }
  if (toilet.status === 'occupied') {
    if (toilet.occupant?.userId === params.userId) {
      return { ok: false, error: 'Kamu sudah berada di dalam toilet.' };
    }
    return { ok: false, error: `${toilet.name} sedang terisi. Silakan masuk antrean.` };
  }
  if (
    toilet.reservedFor &&
    toilet.reservedFor.expiresAt > now &&
    toilet.reservedFor.userId !== params.userId
  ) {
    return {
      ok: false,
      error: `${toilet.name} sedang menunggu giliran antrean #1 untuk masuk.`,
    };
  }

  const quota = getDailyQuota(state, params.userId, now);
  if (quota.remaining <= 0) {
    return {
      ok: false,
      error: `Kuota ngising harian kamu sudah habis (maksimal ${DAILY_SESSION_LIMIT}x sehari). Lanjut lagi besok!`,
    };
  }

  const nextToilet: Stall = {
    ...toilet,
    status: 'occupied',
    reservedFor: null,
    occupant: {
      userId: params.userId,
      displayName: checked.name,
      department: checked.department,
      isAnonymous: params.isAnonymous,
      isGuest: Boolean(params.isGuest),
      need: params.need,
      startedAt: now,
    },
  };

  const nextQueue = state.queue.filter((q) => q.userId !== params.userId);

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        toilet: nextToilet,
        queue: nextQueue,
        serverNow: now,
      },
      now
    ),
  };
}

export function releaseStall(
  state: OfficeState,
  params: { userId: string; force?: boolean },
  now: number
): { ok: true; state: OfficeState; completed: HistoryEntry } | { ok: false; error: string } {
  const toilet = state.toilet;
  if (toilet.status !== 'occupied' || !toilet.occupant) {
    return { ok: false, error: 'Toilet sedang tidak terisi.' };
  }
  if (!params.force && toilet.occupant.userId !== params.userId) {
    return {
      ok: false,
      error: 'Hanya pengguna yang sedang di dalam yang dapat menyelesaikan sesi ini.',
    };
  }

  const occ = toilet.occupant;
  const durationMs = Math.max(1000, now - occ.startedAt);
  const completed: HistoryEntry = {
    id: `hist-${now}-${Math.random().toString(36).slice(2, 7)}`,
    stallId: toilet.id,
    stallName: toilet.name,
    userId: occ.userId,
    displayName: occ.displayName,
    department: occ.department,
    isAnonymous: occ.isAnonymous,
    isGuest: Boolean(occ.isGuest),
    need: occ.need,
    startedAt: occ.startedAt,
    endedAt: now,
    durationMs,
  };

  const nextToilet: Stall = {
    ...toilet,
    status: 'available',
    occupant: null,
    reservedFor: null,
  };

  return {
    ok: true,
    completed,
    state: promoteNextEligible(
      {
        ...state,
        toilet: nextToilet,
        history: [completed, ...state.history].slice(0, 300),
        serverNow: now,
      },
      now
    ),
  };
}

export function joinQueue(
  state: OfficeState,
  params: {
    userId: string;
    displayName: string;
    department: string;
    isAnonymous: boolean;
    isGuest?: boolean;
    need: NeedType;
  },
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const checked = validateEmployeeInput(params.displayName, params.department);
  if (!checked.valid) {
    return { ok: false, error: checked.error };
  }

  if (state.toilet.occupant?.userId === params.userId) {
    return { ok: false, error: 'Kamu sedang berada di dalam toilet.' };
  }

  if (state.queue.some((q) => q.userId === params.userId)) {
    return { ok: false, error: 'Kamu sudah terdaftar di dalam antrean saat ini.' };
  }

  const quota = getDailyQuota(state, params.userId, now);
  if (quota.remaining <= 0) {
    return {
      ok: false,
      error: `Kuota ngising harian kamu sudah habis (maksimal ${DAILY_SESSION_LIMIT}x sehari). Lanjut lagi besok!`,
    };
  }

  const entry: QueueEntry = {
    id: `q-${now}-${Math.random().toString(36).slice(2, 7)}`,
    userId: params.userId,
    displayName: checked.name,
    department: checked.department,
    isAnonymous: params.isAnonymous,
    isGuest: Boolean(params.isGuest),
    need: params.need,
    joinedAt: now,
    status: 'waiting',
    calledStallId: null,
    calledAt: null,
    expiresAt: null,
  };

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        queue: [...state.queue, entry],
        serverNow: now,
      },
      now
    ),
  };
}

export function leaveQueue(
  state: OfficeState,
  userId: string,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const exists = state.queue.some((q) => q.userId === userId);
  if (!exists) {
    return { ok: false, error: 'Kamu tidak sedang dalam antrean.' };
  }

  const nextToilet: Stall =
    state.toilet.reservedFor?.userId === userId
      ? { ...state.toilet, reservedFor: null }
      : state.toilet;

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        toilet: nextToilet,
        queue: state.queue.filter((q) => q.userId !== userId),
        serverNow: now,
      },
      now
    ),
  };
}

export function toggleStallMaintenance(
  state: OfficeState,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const toilet = state.toilet;
  if (toilet.status === 'occupied') {
    return { ok: false, error: 'Tidak bisa mengaktifkan mode perawatan saat toilet sedang dipakai.' };
  }

  const nextStatus = toilet.status === 'maintenance' ? 'available' : 'maintenance';
  let nextQueue = state.queue;
  if (nextStatus === 'maintenance' && toilet.reservedFor) {
    const reservedQueueId = toilet.reservedFor.queueId;
    nextQueue = state.queue.map((q) =>
      q.id === reservedQueueId
        ? { ...q, status: 'waiting', calledStallId: null, calledAt: null, expiresAt: null }
        : q
    );
  }

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        toilet: {
          ...toilet,
          status: nextStatus,
          reservedFor: null,
        },
        queue: nextQueue,
        serverNow: now,
      },
      now
    ),
  };
}

export function updateToiletInfo(
  state: OfficeState,
  params: { name: string; location: string },
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const name = params.name.trim();
  const location = params.location.trim();
  if (name.length < 2) {
    return { ok: false, error: 'Nama toilet minimal 2 karakter.' };
  }
  if (location.length < 2) {
    return { ok: false, error: 'Lokasi toilet minimal 2 karakter.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      toilet: {
        ...state.toilet,
        name: name.slice(0, 40),
        location: location.slice(0, 40),
      },
      serverNow: now,
    },
  };
}

export function prioritizeQueueEntry(
  state: OfficeState,
  queueId: string,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const idx = state.queue.findIndex((q) => q.id === queueId);
  if (idx === -1) {
    return { ok: false, error: 'Data antrean tidak ditemukan.' };
  }
  const target = state.queue[idx];
  if (target.status === 'called') {
    return { ok: true, state };
  }

  const waitingOnly = state.queue.filter((q) => q.id !== queueId);
  const calledIdx = waitingOnly.findIndex((q) => q.status === 'called');
  const nextQueue =
    calledIdx !== -1
      ? [waitingOnly[0], target, ...waitingOnly.slice(1)]
      : [target, ...waitingOnly];

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        queue: nextQueue,
        serverNow: now,
      },
      now
    ),
  };
}

export function removeQueueEntry(
  state: OfficeState,
  queueId: string,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const target = state.queue.find((q) => q.id === queueId);
  if (!target) {
    return { ok: false, error: 'Data antrean tidak ditemukan.' };
  }
  const nextToilet =
    state.toilet.reservedFor?.queueId === queueId
      ? { ...state.toilet, reservedFor: null }
      : state.toilet;

  return {
    ok: true,
    state: promoteNextEligible(
      {
        ...state,
        toilet: nextToilet,
        queue: state.queue.filter((q) => q.id !== queueId),
        serverNow: now,
      },
      now
    ),
  };
}

export function clearQueue(state: OfficeState, now: number): OfficeState {
  return {
    ...state,
    toilet: {
      ...state.toilet,
      reservedFor: null,
    },
    queue: [],
    serverNow: now,
  };
}

export function removeHistoryEntry(
  state: OfficeState,
  historyId: string,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const exists = state.history.some((h) => h.id === historyId);
  if (!exists) {
    return { ok: false, error: 'Catatan riwayat tidak ditemukan.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      history: state.history.filter((h) => h.id !== historyId),
      serverNow: now,
    },
  };
}

export function removeGuestbookEntry(
  state: OfficeState,
  entryId: string,
  now: number
): { ok: true; state: OfficeState } | { ok: false; error: string } {
  const exists = state.guestbook.some((g) => g.id === entryId);
  if (!exists) {
    return { ok: false, error: 'Catatan buku tamu tidak ditemukan.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      guestbook: state.guestbook.filter((g) => g.id !== entryId),
      serverNow: now,
    },
  };
}

export function getAverageDurations(history: HistoryEntry[]): {
  avgPupMs: number;
  avgCepatMs: number;
} {
  const pupItems = history.filter((h) => h.need === 'pup');
  const cepatItems = history.filter((h) => h.need === 'cepat');

  const avgPupMs =
    pupItems.length > 0
      ? Math.round(pupItems.reduce((acc, cur) => acc + cur.durationMs, 0) / pupItems.length)
      : DEFAULT_PUP_MS;

  const avgCepatMs =
    cepatItems.length > 0
      ? Math.round(cepatItems.reduce((acc, cur) => acc + cur.durationMs, 0) / cepatItems.length)
      : DEFAULT_CEPAT_MS;

  return { avgPupMs, avgCepatMs };
}

export function estimateWaitMinutes(
  toilet: Stall,
  queue: QueueEntry[],
  history: HistoryEntry[],
  waitingIndex: number,
  now: number
): number {
  if (toilet.status === 'available' && toilet.reservedFor === null && waitingIndex === 0) {
    return 0;
  }

  const { avgPupMs, avgCepatMs } = getAverageDurations(history);

  let waitMs = 0;
  if (toilet.status === 'occupied' && toilet.occupant) {
    const expected = toilet.occupant.need === 'pup' ? avgPupMs : avgCepatMs;
    const elapsed = Math.max(0, now - toilet.occupant.startedAt);
    waitMs += Math.max(60_000, expected - elapsed);
  } else if (toilet.reservedFor) {
    waitMs += 60_000;
  }

  const waitingAhead = queue.filter((q) => q.status === 'waiting').slice(0, waitingIndex);
  for (const person of waitingAhead) {
    waitMs += person.need === 'pup' ? avgPupMs : avgCepatMs;
  }

  return Math.max(1, Math.round(waitMs / 60_000));
}

function aggregateLeaderboard(
  items: HistoryEntry[],
  sortBy: 'duration' | 'sessions'
): LeaderboardEntry[] {
  const userMap = new Map<string, LeaderboardEntry>();
  for (const item of items) {
    const publicName = getPublicDisplayName(item.displayName, item.isAnonymous, item.userId);
    const existing = userMap.get(item.userId);
    if (!existing) {
      userMap.set(item.userId, {
        userId: item.userId,
        displayName: publicName,
        department: item.department,
        totalSessions: 1,
        pupSessions: item.need === 'pup' ? 1 : 0,
        cepatSessions: item.need === 'cepat' ? 1 : 0,
        totalDurationMs: item.durationMs,
        avgDurationMs: item.durationMs,
        longestDurationMs: item.durationMs,
      });
    } else {
      existing.totalSessions += 1;
      if (item.need === 'pup') {
        existing.pupSessions += 1;
      } else {
        existing.cepatSessions += 1;
      }
      existing.totalDurationMs += item.durationMs;
      existing.avgDurationMs = Math.round(existing.totalDurationMs / existing.totalSessions);
      if (item.durationMs > existing.longestDurationMs) {
        existing.longestDurationMs = item.durationMs;
      }
    }
  }

  const entries = Array.from(userMap.values());
  if (sortBy === 'sessions') {
    return entries.sort(
      (a, b) =>
        b.totalSessions - a.totalSessions || b.totalDurationMs - a.totalDurationMs
    );
  }
  return entries.sort((a, b) => b.totalDurationMs - a.totalDurationMs);
}

export function computeWeeklyLeaderboard(
  history: HistoryEntry[],
  now: number
): {
  entries: LeaderboardEntry[];
  totalSessions: number;
  pupSessions: number;
  cepatSessions: number;
  weekRangeLabel: string;
} {
  const todayStartMs = getTodayStartMs(now);
  const weekStartMs = todayStartMs - (WEEKLY_WINDOW_DAYS - 1) * 86_400_000;
  const weeklyItems = history.filter((h) => h.startedAt >= weekStartMs && h.startedAt <= now + 60_000);

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  return {
    entries: aggregateLeaderboard(weeklyItems, 'sessions'),
    totalSessions: weeklyItems.length,
    pupSessions: weeklyItems.filter((h) => h.need === 'pup').length,
    cepatSessions: weeklyItems.filter((h) => h.need === 'cepat').length,
    weekRangeLabel: `${fmt(weekStartMs)} – ${fmt(todayStartMs)}`,
  };
}

export function computeOfficeStats(history: HistoryEntry[], now: number): OfficeStats {
  const todayStartMs = getTodayStartMs(now);

  const todayHistory = history.filter((h) => h.startedAt >= todayStartMs);
  const activeDataset = todayHistory.length > 0 ? todayHistory : history;

  const pupToday = todayHistory.filter((h) => h.need === 'pup').length;
  const cepatToday = todayHistory.filter((h) => h.need === 'cepat').length;
  const { avgPupMs, avgCepatMs } = getAverageDurations(activeDataset);

  const sessionHours = activeDataset.map((item) => new Date(item.startedAt).getHours());
  const currentHour = new Date(now).getHours();
  const minHour = sessionHours.length > 0 ? Math.min(...sessionHours, currentHour) : 8;
  const maxHour = sessionHours.length > 0 ? Math.max(...sessionHours, currentHour) : 19;
  const spanStart = Math.max(0, Math.min(minHour, maxHour - 11));
  const spanEnd = Math.min(23, Math.max(maxHour, spanStart + 11));

  const hourMap = new Map<number, HourlyBucket>();
  for (let h = spanStart; h <= spanEnd; h += 1) {
    hourMap.set(h, {
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      pupCount: 0,
      cepatCount: 0,
      totalCount: 0,
    });
  }

  for (const item of activeDataset) {
    const hr = new Date(item.startedAt).getHours();
    let bucket = hourMap.get(hr);
    if (!bucket) {
      bucket = {
        hour: hr,
        label: `${String(hr).padStart(2, '0')}:00`,
        pupCount: 0,
        cepatCount: 0,
        totalCount: 0,
      };
      hourMap.set(hr, bucket);
    }
    if (item.need === 'pup') {
      bucket.pupCount += 1;
    } else {
      bucket.cepatCount += 1;
    }
    bucket.totalCount += 1;
  }

  const hourly = Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
  const peakBucket = hourly.reduce<HourlyBucket | null>(
    (best, cur) => (!best || cur.totalCount > best.totalCount ? cur : best),
    null
  );
  const peakHourLabel =
    peakBucket && peakBucket.totalCount > 0 ? peakBucket.label : 'Belum ada data';

  const leaderboard = aggregateLeaderboard(activeDataset, 'duration');
  const weekly = computeWeeklyLeaderboard(history, now);

  return {
    totalToday: todayHistory.length,
    pupToday,
    cepatToday,
    avgPupMs,
    avgCepatMs,
    peakHourLabel,
    hourly,
    leaderboard,
    weeklyLeaderboard: weekly.entries,
    weeklyTotalSessions: weekly.totalSessions,
    weeklyPupSessions: weekly.pupSessions,
    weeklyCepatSessions: weekly.cepatSessions,
    weekRangeLabel: weekly.weekRangeLabel,
  };
}

export function computePersonalStats(
  history: HistoryEntry[],
  userId: string,
  now: number
): PersonalStats {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayStartMs = startOfDay.getTime();

  const mine = history.filter((h) => h.userId === userId);
  const mineToday = mine.filter((h) => h.startedAt >= todayStartMs);
  const pupMine = mine.filter((h) => h.need === 'pup');
  const cepatMine = mine.filter((h) => h.need === 'cepat');

  const avgPupMs =
    pupMine.length > 0
      ? Math.round(pupMine.reduce((sum, item) => sum + item.durationMs, 0) / pupMine.length)
      : 0;
  const avgCepatMs =
    cepatMine.length > 0
      ? Math.round(cepatMine.reduce((sum, item) => sum + item.durationMs, 0) / cepatMine.length)
      : 0;

  const totalDurationTodayMs = mineToday.reduce((sum, item) => sum + item.durationMs, 0);
  const longestDurationMs = mine.reduce(
    (max, item) => (item.durationMs > max ? item.durationMs : max),
    0
  );

  return {
    totalSessions: mine.length,
    todaySessions: mineToday.length,
    pupSessions: pupMine.length,
    cepatSessions: cepatMine.length,
    avgPupMs,
    avgCepatMs,
    totalDurationTodayMs,
    longestDurationMs,
    recentSessions: mine.slice(0, 6),
  };
}
