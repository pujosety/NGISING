import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GuestbookEntry,
  GuestSession,
  NeedType,
  OfficeState,
  UserAccount,
  UserRole,
} from '../shared/types.ts';
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
  localUpdateProfile,
  subscribeLocalChanges,
} from '../utils/localOfficeFallback.ts';

const TOKEN_STORAGE_KEY = 'ngising_auth_token_v1';
const GUEST_TOKEN_STORAGE_KEY = 'ngising_guest_token_v1';
const SOUND_STORAGE_KEY = 'ngising_sound_v1';

export interface DemoAccountInfo {
  id: string;
  email: string;
  displayName: string;
  department: string;
  role: UserRole;
}

export interface AdminUserSummary extends UserAccount {
  sessionCount: number;
}

type FetchJsonResult<T> =
  | { kind: 'ok'; status: number; data: T }
  | { kind: 'http_error'; status: number; data: T | null }
  | { kind: 'backend_unavailable' };

async function safeFetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      // Static hosts (e.g. Wasmer Edge static build) often serve HTML 200/404 for /api/*
      return { kind: 'backend_unavailable' };
    }

    const data = (await res.json()) as T;
    if (!res.ok) {
      return { kind: 'http_error', status: res.status, data };
    }
    return { kind: 'ok', status: res.status, data };
  } catch {
    return { kind: 'backend_unavailable' };
  }
}

function playTurnAlertSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // Ignore browser autoplay restrictions
  }
}

function readStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveStoredValue(key: string, value: string | null): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function useOfficeQueue() {
  const [state, setState] = useState<OfficeState | null>(null);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [token, setToken] = useState<string | null>(() => readStoredValue(TOKEN_STORAGE_KEY));
  const [guestToken, setGuestToken] = useState<string | null>(() =>
    readStoredValue(GUEST_TOKEN_STORAGE_KEY)
  );
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountInfo[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [adminGuestbook, setAdminGuestbook] = useState<GuestbookEntry[]>([]);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [now, setNow] = useState<number>(() => Date.now());

  const serverOffsetRef = useRef<number>(0);
  const wasCalledRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const localModeRef = useRef<boolean>(false);

  const applyServerState = useCallback((incoming: OfficeState) => {
    serverOffsetRef.current = incoming.serverNow - Date.now();
    setState(incoming);
    setNow(Date.now() + serverOffsetRef.current);
  }, []);

  const activateLocalFallback = useCallback(() => {
    if (!localModeRef.current) {
      localModeRef.current = true;
      setIsLocalFallback(true);
    }
    setConnected(true);
    setDemoAccounts(localGetDemoAccounts());
    applyServerState(localGetPublicState());
  }, [applyServerState]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  // Bootstrap auth/guest session + demo account directory + initial toilet state
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const [stateRes, demoRes] = await Promise.all([
          safeFetchJson<OfficeState>('/api/state'),
          safeFetchJson<{ accounts: DemoAccountInfo[] }>('/api/auth/demo-accounts'),
        ]);

        if (!active) return;

        if (stateRes.kind === 'backend_unavailable' || demoRes.kind === 'backend_unavailable') {
          activateLocalFallback();
        } else {
          if (stateRes.kind === 'ok') {
            applyServerState(stateRes.data);
          }
          if (demoRes.kind === 'ok') {
            setDemoAccounts(demoRes.data.accounts ?? []);
          }
        }

        const params = new URLSearchParams(window.location.search);
        const autostart = params.get('autostart') === '1';
        const existingToken = readStoredValue(TOKEN_STORAGE_KEY);
        const existingGuestToken = readStoredValue(GUEST_TOKEN_STORAGE_KEY);

        if (localModeRef.current) {
          if (existingToken) {
            const localUser = localGetUserByToken(existingToken);
            if (active && localUser) {
              setUser(localUser);
              setToken(existingToken);
              setGuest(null);
              setGuestToken(null);
              saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
              return;
            }
            saveStoredValue(TOKEN_STORAGE_KEY, null);
            setToken(null);
            setUser(null);
          }
          if (autostart) {
            const loginRes = localLogin('siti@kantor.id', 'ngising123');
            if (active && loginRes.ok) {
              saveStoredValue(TOKEN_STORAGE_KEY, loginRes.token);
              setToken(loginRes.token);
              setUser(loginRes.user);
              return;
            }
          }
          if (existingGuestToken) {
            const localGuest = localGetGuestByToken(existingGuestToken);
            if (active && localGuest) {
              setGuest(localGuest);
              setGuestToken(existingGuestToken);
              return;
            }
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            setGuestToken(null);
            setGuest(null);
          }
          return;
        }

        if (existingToken) {
          const meRes = await safeFetchJson<{ user: UserAccount }>('/api/auth/me', {
            headers: { Authorization: `Bearer ${existingToken}` },
          });
          if (active && meRes.kind === 'ok') {
            setUser(meRes.data.user);
            setToken(existingToken);
            setGuest(null);
            setGuestToken(null);
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            return;
          }
          if (active) {
            saveStoredValue(TOKEN_STORAGE_KEY, null);
            setToken(null);
            setUser(null);
          }
        }

        if (autostart) {
          const loginRes = await safeFetchJson<{ token: string; user: UserAccount }>(
            '/api/auth/login',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                identifier: 'siti@kantor.id',
                password: 'ngising123',
              }),
            }
          );
          if (active && loginRes.kind === 'ok') {
            saveStoredValue(TOKEN_STORAGE_KEY, loginRes.data.token);
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            setToken(loginRes.data.token);
            setUser(loginRes.data.user);
            setGuestToken(null);
            setGuest(null);
            return;
          }
        }

        if (existingGuestToken) {
          const guestRes = await safeFetchJson<{ guest: GuestSession }>('/api/guest/me', {
            headers: { Authorization: `Bearer ${existingGuestToken}` },
          });
          if (active && guestRes.kind === 'ok') {
            setGuest(guestRes.data.guest);
            setGuestToken(existingGuestToken);
          } else if (active) {
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            setGuestToken(null);
            setGuest(null);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [activateLocalFallback, applyServerState]);

  // 1-second timer tick aligned to server clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now() + serverOffsetRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // WebSocket live state subscription (or BroadcastChannel when in local fallback)
  useEffect(() => {
    if (isLocalFallback) {
      const unsub = subscribeLocalChanges(() => {
        applyServerState(localGetPublicState());
      });
      return unsub;
    }

    let disposed = false;
    let attempt = 0;

    const connect = () => {
      if (disposed || localModeRef.current) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            state?: OfficeState;
          };
          if (msg.type === 'state:sync' && msg.state) {
            applyServerState(msg.state);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (disposed || localModeRef.current) return;
        setConnected(false);
        const delay = Math.min(8000, 1000 * Math.pow(1.5, attempt));
        attempt += 1;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [applyServerState, isLocalFallback]);

  // Turn chime when authenticated user OR checked-in guest becomes 'called'
  const activeActorId = user?.id ?? guest?.id ?? null;
  useEffect(() => {
    if (!state || !activeActorId) return;
    const isCalledNow = state.queue.some(
      (q) => q.userId === activeActorId && q.status === 'called'
    );
    if (isCalledNow && !wasCalledRef.current && soundEnabled) {
      playTurnAlertSound();
    }
    wasCalledRef.current = isCalledNow;
  }, [state, activeActorId, soundEnabled]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<boolean> => {
      setAuthLoading(true);
      setErrorMessage(null);
      try {
        if (!localModeRef.current) {
          const res = await safeFetchJson<{
            token?: string;
            user?: UserAccount;
            error?: string;
          }>('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
          });
          if (res.kind !== 'backend_unavailable') {
            if (res.kind === 'http_error' || !res.data.token || !res.data.user) {
              setErrorMessage(res.data?.error || 'Gagal masuk ke akun.');
              return false;
            }
            saveStoredValue(TOKEN_STORAGE_KEY, res.data.token);
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            setToken(res.data.token);
            setUser(res.data.user);
            setGuestToken(null);
            setGuest(null);
            return true;
          }
          activateLocalFallback();
        }

        const localRes = localLogin(identifier, password);
        if (!localRes.ok) {
          setErrorMessage(localRes.error);
          return false;
        }
        saveStoredValue(TOKEN_STORAGE_KEY, localRes.token);
        saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
        setToken(localRes.token);
        setUser(localRes.user);
        setGuestToken(null);
        setGuest(null);
        return true;
      } finally {
        setAuthLoading(false);
      }
    },
    [activateLocalFallback]
  );

  const register = useCallback(
    async (params: {
      displayName: string;
      password: string;
      isAnonymous?: boolean;
    }): Promise<boolean> => {
      setAuthLoading(true);
      setErrorMessage(null);
      try {
        if (!localModeRef.current) {
          const res = await safeFetchJson<{
            token?: string;
            user?: UserAccount;
            error?: string;
          }>('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });
          if (res.kind !== 'backend_unavailable') {
            if (res.kind === 'http_error' || !res.data.token || !res.data.user) {
              setErrorMessage(res.data?.error || 'Gagal mendaftarkan akun.');
              return false;
            }
            saveStoredValue(TOKEN_STORAGE_KEY, res.data.token);
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
            setToken(res.data.token);
            setUser(res.data.user);
            setGuestToken(null);
            setGuest(null);
            return true;
          }
          activateLocalFallback();
        }

        const localRes = localRegister(params);
        if (!localRes.ok) {
          setErrorMessage(localRes.error);
          return false;
        }
        saveStoredValue(TOKEN_STORAGE_KEY, localRes.token);
        saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
        setToken(localRes.token);
        setUser(localRes.user);
        setGuestToken(null);
        setGuest(null);
        return true;
      } finally {
        setAuthLoading(false);
      }
    },
    [activateLocalFallback]
  );

  const checkInGuest = useCallback(
    async (params: { guestName: string; origin: string }): Promise<boolean> => {
      setAuthLoading(true);
      setErrorMessage(null);
      try {
        if (!localModeRef.current) {
          const res = await safeFetchJson<{
            token?: string;
            guest?: GuestSession;
            error?: string;
          }>('/api/guest/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });
          if (res.kind !== 'backend_unavailable') {
            if (res.kind === 'http_error' || !res.data.token || !res.data.guest) {
              setErrorMessage(res.data?.error || 'Gagal mengisi buku tamu.');
              return false;
            }
            saveStoredValue(TOKEN_STORAGE_KEY, null);
            saveStoredValue(GUEST_TOKEN_STORAGE_KEY, res.data.token);
            setToken(null);
            setUser(null);
            setGuestToken(res.data.token);
            setGuest(res.data.guest);
            return true;
          }
          activateLocalFallback();
        }

        const localRes = localGuestCheckIn(params);
        if (!localRes.ok) {
          setErrorMessage(localRes.error);
          return false;
        }
        saveStoredValue(TOKEN_STORAGE_KEY, null);
        saveStoredValue(GUEST_TOKEN_STORAGE_KEY, localRes.token);
        setToken(null);
        setUser(null);
        setGuestToken(localRes.token);
        setGuest(localRes.guest);
        applyServerState(localRes.state);
        return true;
      } finally {
        setAuthLoading(false);
      }
    },
    [activateLocalFallback, applyServerState]
  );

  const exitGuest = useCallback(() => {
    saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
    setGuestToken(null);
    setGuest(null);
    setErrorMessage(null);
  }, []);

  const logout = useCallback(() => {
    saveStoredValue(TOKEN_STORAGE_KEY, null);
    setToken(null);
    setUser(null);
    setAdminUsers([]);
    setAdminGuestbook([]);
    setErrorMessage(null);
  }, []);

  const updateProfile = useCallback(
    async (params: {
      displayName: string;
      department: string;
      isAnonymous: boolean;
    }): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current) {
          const res = localUpdateProfile(token, params);
          if (!res.ok) {
            setErrorMessage(res.error);
            return false;
          }
          setUser(res.user);
          applyServerState(res.state);
          return true;
        }

        const res = await safeFetchJson<{ user?: UserAccount; error?: string }>(
          '/api/auth/profile',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(params),
          }
        );
        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi terputus saat memperbarui profil.');
          return false;
        }
        if (res.kind === 'http_error' || !res.data.user) {
          setErrorMessage(res.data?.error || 'Gagal memperbarui profil.');
          return false;
        }
        setUser(res.data.user);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [applyServerState, token]
  );

  const activeToken = token || guestToken;

  const mutate = useCallback(
    async (
      url: string,
      body?: unknown,
      method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
      localAction?: () => { ok: true; state: OfficeState } | { ok: false; error: string; status?: number }
    ): Promise<boolean> => {
      if (!activeToken) {
        setErrorMessage('Silakan masuk akun atau isi Buku Tamu terlebih dahulu.');
        return false;
      }
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current && localAction) {
          const localRes = localAction();
          if (!localRes.ok) {
            setErrorMessage(localRes.error);
            return false;
          }
          applyServerState(localRes.state);
          return true;
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${activeToken}`,
        };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const res = await safeFetchJson<OfficeState & { error?: string }>(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi ke server terputus.');
          return false;
        }
        if (res.kind === 'http_error') {
          if (res.status === 401) {
            if (token) {
              saveStoredValue(TOKEN_STORAGE_KEY, null);
              setToken(null);
              setUser(null);
            } else {
              saveStoredValue(GUEST_TOKEN_STORAGE_KEY, null);
              setGuestToken(null);
              setGuest(null);
            }
          }
          setErrorMessage(res.data?.error || 'Terjadi kesalahan pada server.');
          return false;
        }
        applyServerState(res.data);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [activeToken, applyServerState, token]
  );

  const occupy = useCallback(
    (need: NeedType) =>
      mutate('/api/occupy', { need }, 'POST', () =>
        localMutateActor(activeToken || '', 'occupy', { need })
      ),
    [activeToken, mutate]
  );

  const release = useCallback(
    (force = false) =>
      mutate('/api/release', { force }, 'POST', () =>
        localMutateActor(activeToken || '', 'release', { force })
      ),
    [activeToken, mutate]
  );

  const joinQueue = useCallback(
    (need: NeedType) =>
      mutate('/api/queue/join', { need }, 'POST', () =>
        localMutateActor(activeToken || '', 'join', { need })
      ),
    [activeToken, mutate]
  );

  const leaveQueue = useCallback(
    () =>
      mutate('/api/queue/leave', {}, 'POST', () =>
        localMutateActor(activeToken || '', 'leave')
      ),
    [activeToken, mutate]
  );

  // --- Admin Panel Actions ---

  const fetchAdminUsers = useCallback(async (): Promise<void> => {
    if (!token || user?.role !== 'admin') return;
    if (localModeRef.current) {
      const data = localGetAdminData(token);
      if (data) {
        setAdminUsers(data.users);
        setAdminGuestbook(data.guestbook);
      }
      return;
    }

    const res = await safeFetchJson<{
      users?: AdminUserSummary[];
      guestbook?: GuestbookEntry[];
    }>('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.kind === 'ok') {
      if (res.data.users) setAdminUsers(res.data.users);
      if (res.data.guestbook) setAdminGuestbook(res.data.guestbook);
    }
  }, [token, user?.role]);

  const adminUpdateToilet = useCallback(
    (name: string, location: string) =>
      mutate('/api/admin/toilet', { name, location }, 'PATCH', () => {
        const res = localAdminAction(token || '', { type: 'updateToilet', name, location });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminToggleMaintenance = useCallback(
    () =>
      mutate('/api/admin/toilet/maintenance', {}, 'POST', () => {
        const res = localAdminAction(token || '', { type: 'toggleMaintenance' });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminForceRelease = useCallback(
    () =>
      mutate('/api/admin/toilet/force-release', {}, 'POST', () => {
        const res = localAdminAction(token || '', { type: 'forceRelease' });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminPrioritizeQueue = useCallback(
    (queueId: string) =>
      mutate(`/api/admin/queue/${encodeURIComponent(queueId)}/prioritize`, {}, 'POST', () => {
        const res = localAdminAction(token || '', { type: 'prioritizeQueue', queueId });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminRemoveQueue = useCallback(
    (queueId: string) =>
      mutate(`/api/admin/queue/${encodeURIComponent(queueId)}`, undefined, 'DELETE', () => {
        const res = localAdminAction(token || '', { type: 'removeQueue', queueId });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminClearQueue = useCallback(
    () =>
      mutate('/api/admin/queue/clear', {}, 'POST', () => {
        const res = localAdminAction(token || '', { type: 'clearQueue' });
        return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
      }),
    [mutate, token]
  );

  const adminDeleteHistory = useCallback(
    async (historyId: string): Promise<boolean> => {
      const ok = await mutate(
        `/api/admin/history/${encodeURIComponent(historyId)}`,
        undefined,
        'DELETE',
        () => {
          const res = localAdminAction(token || '', { type: 'deleteHistory', historyId });
          return res.ok && res.state ? { ok: true, state: res.state } : { ok: false, error: res.ok ? 'Gagal' : res.error };
        }
      );
      if (ok) void fetchAdminUsers();
      return ok;
    },
    [mutate, fetchAdminUsers, token]
  );

  const adminDeleteGuestbook = useCallback(
    async (entryId: string): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current) {
          const localRes = localAdminAction(token, { type: 'deleteGuestbook', entryId });
          if (!localRes.ok) {
            setErrorMessage(localRes.error);
            return false;
          }
          if (localRes.guestbook) setAdminGuestbook(localRes.guestbook);
          if (localRes.state) applyServerState(localRes.state);
          return true;
        }

        const res = await safeFetchJson<{
          guestbook?: GuestbookEntry[];
          state?: OfficeState;
          error?: string;
        }>(`/api/admin/guestbook/${encodeURIComponent(entryId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi ke server terputus.');
          return false;
        }
        if (res.kind === 'http_error') {
          setErrorMessage(res.data?.error || 'Gagal menghapus catatan buku tamu.');
          return false;
        }
        if (res.data.guestbook) setAdminGuestbook(res.data.guestbook);
        if (res.data.state) applyServerState(res.data.state);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [token, applyServerState]
  );

  const adminUpdateUserRole = useCallback(
    async (userId: string, role: UserRole): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current) {
          const localRes = localAdminAction(token, { type: 'updateUserRole', userId, role });
          if (!localRes.ok) {
            setErrorMessage(localRes.error);
            return false;
          }
          if (localRes.users) setAdminUsers(localRes.users);
          return true;
        }

        const res = await safeFetchJson<{ users?: AdminUserSummary[]; error?: string }>(
          `/api/admin/users/${encodeURIComponent(userId)}/role`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
          }
        );
        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi ke server terputus.');
          return false;
        }
        if (res.kind === 'http_error') {
          setErrorMessage(res.data?.error || 'Gagal memperbarui peran akun.');
          return false;
        }
        if (res.data.users) setAdminUsers(res.data.users);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const adminResetUserPassword = useCallback(
    async (userId: string, password = 'ngising123'): Promise<string | null> => {
      if (!token) return null;
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current) {
          const localRes = localAdminAction(token, { type: 'resetPassword', userId, password });
          if (!localRes.ok) {
            setErrorMessage(localRes.error);
            return null;
          }
          return localRes.message || 'Password berhasil direset.';
        }

        const res = await safeFetchJson<{ message?: string; error?: string }>(
          `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password }),
          }
        );
        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi ke server terputus.');
          return null;
        }
        if (res.kind === 'http_error') {
          setErrorMessage(res.data?.error || 'Gagal mereset password.');
          return null;
        }
        return res.data.message || 'Password berhasil direset.';
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const adminDeleteUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      setErrorMessage(null);
      try {
        if (localModeRef.current) {
          const localRes = localAdminAction(token, { type: 'deleteUser', userId });
          if (!localRes.ok) {
            setErrorMessage(localRes.error);
            return false;
          }
          if (localRes.users) setAdminUsers(localRes.users);
          if (localRes.state) applyServerState(localRes.state);
          return true;
        }

        const res = await safeFetchJson<{
          users?: AdminUserSummary[];
          state?: OfficeState;
          error?: string;
        }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.kind === 'backend_unavailable') {
          setErrorMessage('Koneksi ke server terputus.');
          return false;
        }
        if (res.kind === 'http_error') {
          setErrorMessage(res.data?.error || 'Gagal menghapus akun.');
          return false;
        }
        if (res.data.users) setAdminUsers(res.data.users);
        if (res.data.state) applyServerState(res.data.state);
        return true;
      } finally {
        setBusy(false);
      }
    },
    [token, applyServerState]
  );

  const adminResetDemo = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    setBusy(true);
    setErrorMessage(null);
    try {
      if (localModeRef.current) {
        const localRes = localAdminAction(token, { type: 'resetDemo' });
        if (!localRes.ok) {
          setErrorMessage(localRes.error);
          return false;
        }
        if (localRes.users) setAdminUsers(localRes.users);
        if (localRes.guestbook) setAdminGuestbook(localRes.guestbook);
        if (localRes.state) applyServerState(localRes.state);
        return true;
      }

      const res = await safeFetchJson<{
        users?: AdminUserSummary[];
        guestbook?: GuestbookEntry[];
        state?: OfficeState;
        error?: string;
      }>('/api/admin/reset-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.kind === 'backend_unavailable') {
        setErrorMessage('Koneksi ke server terputus.');
        return false;
      }
      if (res.kind === 'http_error') {
        setErrorMessage(res.data?.error || 'Gagal mereset data demo.');
        return false;
      }
      if (res.data.users) setAdminUsers(res.data.users);
      if (res.data.guestbook) setAdminGuestbook(res.data.guestbook);
      if (res.data.state) applyServerState(res.data.state);
      return true;
    } finally {
      setBusy(false);
    }
  }, [token, applyServerState]);

  return {
    state,
    user,
    guest,
    demoAccounts,
    adminUsers,
    adminGuestbook,
    isLocalFallback,
    loading,
    authLoading,
    connected,
    busy,
    errorMessage,
    clearError: () => setErrorMessage(null),
    soundEnabled,
    setSoundEnabled,
    now,
    login,
    register,
    checkInGuest,
    exitGuest,
    logout,
    updateProfile,
    occupy,
    release,
    joinQueue,
    leaveQueue,
    fetchAdminUsers,
    adminUpdateToilet,
    adminToggleMaintenance,
    adminForceRelease,
    adminPrioritizeQueue,
    adminRemoveQueue,
    adminClearQueue,
    adminDeleteHistory,
    adminDeleteGuestbook,
    adminUpdateUserRole,
    adminResetUserPassword,
    adminDeleteUser,
    adminResetDemo,
  };
}
