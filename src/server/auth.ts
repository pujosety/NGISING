import crypto from 'crypto';
import type { StoredUserRecord, UserAccount } from '../shared/types.ts';

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
      uid?: string;
    };
    if (!parsed.uid) return null;
    return { userId: parsed.uid };
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
    isAnonymous: record.isAnonymous,
    createdAt: record.createdAt,
  };
}
