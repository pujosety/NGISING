export type NeedType = 'pup' | 'cepat';
export type StallStatus = 'available' | 'occupied' | 'maintenance';

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
  createdAt: number;
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
  need: NeedType;
  startedAt: number;
}

export interface StallReservation {
  queueId: string;
  userId: string;
  displayName: string;
  department: string;
  isAnonymous: boolean;
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
  need: NeedType;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface OfficeState {
  toilet: Stall;
  queue: QueueEntry[];
  history: HistoryEntry[];
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

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  department: string;
  totalSessions: number;
  pupSessions: number;
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
