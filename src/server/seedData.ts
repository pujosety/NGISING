import type { OfficeState, StoredUserRecord } from '../shared/types.ts';
import { hashPassword } from './auth.ts';

export function createSeedUsers(now = Date.now()): StoredUserRecord[] {
  const makeUser = (
    id: string,
    email: string,
    displayName: string,
    department: string,
    role: 'admin' | 'employee',
    isAnonymous = false
  ): StoredUserRecord => {
    const { hash, salt } = hashPassword('ngising123');
    return {
      id,
      email,
      displayName,
      department,
      role,
      isAnonymous,
      createdAt: now - 86_400_000,
      passwordHash: hash,
      passwordSalt: salt,
    };
  };

  return [
    makeUser('emp-admin', 'admin@kantor.id', 'Admin Kantor', 'Operasional', 'admin', false),
    makeUser('emp-siti', 'siti@kantor.id', 'Siti Rahma', 'Design', 'employee', false),
    makeUser('emp-dimas', 'dimas@kantor.id', 'Dimas Pratama', 'Engineering', 'employee', false),
    makeUser('emp-bagus', 'bagus@kantor.id', 'Bagus Saputra', 'Product', 'employee', false),
    makeUser('emp-eko', 'eko@kantor.id', 'Eko Nugroho', 'Operations', 'employee', false),
  ];
}

export function createSeedState(now = Date.now()): OfficeState {
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

  const s1 = relPast(5, 20, 8);
  const s2 = relPast(4, 35, 3);
  const s3 = relPast(3, 50, 11);
  const s4 = relPast(3, 15, 4);
  const s5 = relPast(2, 40, 14);
  const s6 = relPast(2, 10, 2);
  const s7 = relPast(1, 25, 9);
  const s8 = relPast(0, 35, 7);

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
        id: 'hist-seed-8',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-siti',
        displayName: 'Siti Rahma',
        department: 'Design',
        isAnonymous: false,
        need: 'pup',
        ...s8,
      },
      {
        id: 'hist-seed-7',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-eko',
        displayName: 'Eko Nugroho',
        department: 'Operations',
        isAnonymous: false,
        need: 'pup',
        ...s7,
      },
      {
        id: 'hist-seed-6',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-bagus',
        displayName: 'Bagus Saputra',
        department: 'Product',
        isAnonymous: false,
        need: 'cepat',
        ...s6,
      },
      {
        id: 'hist-seed-5',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-dimas',
        displayName: 'Dimas Pratama',
        department: 'Engineering',
        isAnonymous: false,
        need: 'pup',
        ...s5,
      },
      {
        id: 'hist-seed-4',
        stallId: 'toilet-utama',
        stallName: 'Toilet Kantor',
        userId: 'emp-siti',
        displayName: 'Siti Rahma',
        department: 'Design',
        isAnonymous: false,
        need: 'cepat',
        ...s4,
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
        ...s3,
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
        ...s2,
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
        ...s1,
      },
    ],
    onlineCount: 1,
    serverNow: now,
  };
}
