import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localAdminAction,
  localGetAdminData,
  localGetDemoAccounts,
  localGetGuestByToken,
  localGetPublicState,
  localGetUserByToken,
  localGuestCheckIn,
  localLogin,
  localMutateActor,
  localRegister,
  type StorageLike,
} from './localOfficeFallback.ts';

function makeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

test('local fallback supports employee registration, login, guestbook check-in, and admin audit', () => {
  const storage = makeStorage();

  const demos = localGetDemoAccounts(storage);
  assert.ok(demos.length >= 5);
  assert.equal(demos[0].role, 'admin');

  // Register new employee (nama + password only)
  const reg = localRegister({ displayName: 'Pujo Setyo Nugroho', password: 'password123' }, storage);
  assert.equal(reg.ok, true);
  if (!reg.ok) return;
  assert.equal(reg.user.displayName, 'Pujo Setyo Nugroho');
  assert.equal(localGetUserByToken(reg.token, storage)?.displayName, 'Pujo Setyo Nugroho');

  // Guest check-in via Buku Tamu
  const guestRes = localGuestCheckIn(
    { guestName: 'Budi Santoso', origin: 'PT Maju Jaya / Meeting' },
    storage
  );
  assert.equal(guestRes.ok, true);
  if (!guestRes.ok) return;
  assert.equal(localGetGuestByToken(guestRes.token)?.displayName, 'Budi Santoso');

  // Guest joins queue
  const joinRes = localMutateActor(guestRes.token, 'join', { need: 'pup' }, storage);
  assert.equal(joinRes.ok, true);
  if (!joinRes.ok) return;
  assert.equal(
    joinRes.state.queue.some((q) => q.userId === guestRes.guest.id && q.isGuest === true),
    true
  );

  // Admin can inspect guestbook & delete entry
  const adminLogin = localLogin('Admin Kantor', 'ngising123', storage);
  assert.equal(adminLogin.ok, true);
  if (!adminLogin.ok) return;

  const adminData = localGetAdminData(adminLogin.token, storage);
  assert.ok(adminData);
  assert.ok(adminData.guestbook.some((g) => g.guestName === 'Budi Santoso'));

  const targetEntry = adminData.guestbook.find((g) => g.guestName === 'Budi Santoso');
  assert.ok(targetEntry);
  const delRes = localAdminAction(
    adminLogin.token,
    { type: 'deleteGuestbook', entryId: targetEntry.id },
    storage
  );
  assert.equal(delRes.ok, true);
  if (delRes.ok) {
    assert.equal(
      delRes.guestbook?.some((g) => g.id === targetEntry.id),
      false
    );
  }

  // Public state strips guestbook for privacy
  const publicState = localGetPublicState(storage);
  assert.equal(publicState.guestbook.length, 0);
});
