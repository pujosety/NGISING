export type NeedType = 'pup' | 'cepat';
export type StallStatus = 'available' | 'occupied' | 'maintenance';
export type UserRole = 'admin' | 'employee';

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  department: string;
  role: UserRole;
  isAnonymous: boolean;
  createdAt: number;
}

export interface GuestSession {
  id: string;
  displayName: string;
  origin: string;
  checkedInAt: number;
}

export interface GuestbookEntry {
  id: string;
  guestId: string;
  guestName: string;
  origin: string;
  visitedAt: number;
}

export interface StoredUserRecord extends UserAccount {
  passwordHash: string;
  passwordSalt: string;
}

export interface StallOccupant {
  userId: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isGuest?: boolean;
  need: NeedType;
  startedAt: number;
}

export interface StallReservation {
  queueId: string;
  userId: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isGuest?: boolean;
  need: NeedType;
  calledAt: number;
  expiresAt: number;
}

export interface Stall {
  id: string;
  name: string;
  location: string;
  status: StallStatus;
  occupant: StallOccupant | null;
  reservedFor: StallReservation | null;
}

export interface QueueEntry {
  id: string;
  userId: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isGuest?: boolean;
  need: NeedType;
  joinedAt: number;
  status: 'waiting' | 'called';
  calledStallId: string | null;
  calledAt: number | null;
  expiresAt: number | null;
}

export interface HistoryEntry {
  id: string;
  stallId: string;
  stallName: string;
  userId: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  isGuest?: boolean;
  need: NeedType;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface OfficeState {
  toilet: Stall;
  queue: QueueEntry[];
  history: HistoryEntry[];
  guestbook: GuestbookEntry[];
  onlineCount: number;
  serverNow: number;
}

export interface HourlyBucket {
  hour: number;
  label: string;
  pupCount: number;
  cepatCount: number;
  totalCount: number;
}

export interface DailyQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  department: string;
  totalSessions: number;
  pupSessions: number;
  cepatSessions: number;
  totalDurationMs: number;
  avgDurationMs: number;
  longestDurationMs: number;
}

export interface OfficeStats {
  totalToday: number;
  pupToday: number;
  cepatToday: number;
  avgPupMs: number;
  avgCepatMs: number;
  peakHourLabel: string;
  hourly: HourlyBucket[];
  leaderboard: LeaderboardEntry[];
  weeklyLeaderboard: LeaderboardEntry[];
  weeklyTotalSessions: number;
  weeklyPupSessions: number;
  weeklyCepatSessions: number;
  weekRangeLabel: string;
}

export interface PersonalStats {
  totalSessions: number;
  todaySessions: number;
  pupSessions: number;
  cepatSessions: number;
  avgPupMs: number;
  avgCepatMs: number;
  totalDurationTodayMs: number;
  longestDurationMs: number;
  recentSessions: HistoryEntry[];
}
