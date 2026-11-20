import crypto from 'crypto';
import type { GuestSession, StoredUserRecord, UserAccount } from '../shared/types.ts';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(userId: string, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      type: 'user',
      uid: userId,
      iat: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const bufA = Buffer.from(sig);
  const bufB = Buffer.from(expectedSig);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      type?: string;
      uid?: string;
    };
    if (parsed.type === 'guest' || !parsed.uid) return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

export function createGuestToken(guest: GuestSession, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      type: 'guest',
      gid: guest.id,
      name: guest.displayName,
      origin: guest.origin,
      iat: guest.checkedInAt,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyGuestToken(token: string, secret: string): GuestSession | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const bufA = Buffer.from(sig);
  const bufB = Buffer.from(expectedSig);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      type?: string;
      gid?: string;
      name?: string;
      origin?: string;
      iat?: number;
    };
    if (parsed.type !== 'guest' || !parsed.gid || !parsed.name || !parsed.origin) {
      return null;
    }
    return {
      id: parsed.gid,
      displayName: parsed.name,
      origin: parsed.origin,
      checkedInAt: parsed.iat ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function toPublicUser(record: StoredUserRecord): UserAccount {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    department: record.department,
    role: record.role || 'employee',
    isAnonymous: record.isAnonymous,
    createdAt: record.createdAt,
  };
}
