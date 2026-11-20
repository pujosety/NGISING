import { useCallback, useEffect, useRef, useState } from 'react';
import type { NeedType, OfficeState, UserAccount, UserRole } from '../shared/types.ts';

const TOKEN_STORAGE_KEY = 'ngising_auth_token_v1';
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

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useOfficeQueue() {
  const [state, setState] = useState<OfficeState | null>(null);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountInfo[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
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

  const applyServerState = useCallback((incoming: OfficeState) => {
    serverOffsetRef.current = incoming.serverNow - Date.now();
    setState(incoming);
    setNow(Date.now() + serverOffsetRef.current);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  // Bootstrap auth session + demo account directory + initial toilet state
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const [stateRes, demoRes] = await Promise.all([
          fetch('/api/state'),
          fetch('/api/auth/demo-accounts'),
        ]);
        if (active && stateRes.ok) {
          const officeData = (await stateRes.json()) as OfficeState;
          applyServerState(officeData);
        }
        if (active && demoRes.ok) {
          const demoData = (await demoRes.json()) as { accounts: DemoAccountInfo[] };
          setDemoAccounts(demoData.accounts ?? []);
        }

        const params = new URLSearchParams(window.location.search);
        const autostart = params.get('autostart') === '1';
        const existingToken = readStoredToken();

        if (existingToken) {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${existingToken}` },
          });
          if (active && meRes.ok) {
            const meData = (await meRes.json()) as { user: UserAccount };
            setUser(meData.user);
            setToken(existingToken);
          } else if (active) {
            saveStoredToken(null);
            setToken(null);
            setUser(null);
          }
        } else if (autostart) {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: 'siti@kantor.id',
              password: 'ngising123',
            }),
          });
          if (active && loginRes.ok) {
            const data = (await loginRes.json()) as { token: string; user: UserAccount };
            saveStoredToken(data.token);
            setToken(data.token);
            setUser(data.user);
          }
        }
      } catch {
        // ignore network hiccup on initial load
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [applyServerState]);

  // 1-second timer tick aligned to server clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now() + serverOffsetRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // WebSocket live state subscription
  useEffect(() => {
    let disposed = false;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;
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
        if (disposed) return;
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
  }, [applyServerState]);

  // Turn chime when authenticated user becomes 'called'
  useEffect(() => {
    if (!state || !user) return;
    const isCalledNow = state.queue.some(
      (q) => q.userId === user.id && q.status === 'called'
    );
    if (isCalledNow && !wasCalledRef.current && soundEnabled) {
      playTurnAlertSound();
    }
    wasCalledRef.current = isCalledNow;
  }, [state, user, soundEnabled]);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { token?: string; user?: UserAccount; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setErrorMessage(data.error || 'Gagal masuk ke akun.');
        return false;
      }
      saveStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch {
      setErrorMessage('Koneksi gagal. Periksa jaringanmu.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const register = useCallback(
    async (params: {
      displayName: string;
      password: string;
      isAnonymous?: boolean;
    }): Promise<boolean> => {
      setAuthLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = (await res.json()) as { token?: string; user?: UserAccount; error?: string };
        if (!res.ok || !data.token || !data.user) {
          setErrorMessage(data.error || 'Gagal mendaftarkan akun.');
          return false;
        }
        saveStoredToken(data.token);
        setToken(data.token);
        setUser(data.user);
        return true;
      } catch {
        setErrorMessage('Koneksi gagal. Periksa jaringanmu.');
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    saveStoredToken(null);
    setToken(null);
    setUser(null);
    setAdminUsers([]);
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
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });
        const data = (await res.json()) as { user?: UserAccount; error?: string };
        if (!res.ok || !data.user) {
          setErrorMessage(data.error || 'Gagal memperbarui profil.');
          return false;
        }
        setUser(data.user);
        return true;
      } catch {
        setErrorMessage('Koneksi terputus saat memperbarui profil.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const mutate = useCallback(
    async (
      url: string,
      body?: unknown,
      method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
    ): Promise<boolean> => {
      if (!token) {
        setErrorMessage('Silakan masuk ke akun Ngising terlebih dahulu.');
        return false;
      }
      setBusy(true);
      setErrorMessage(null);
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = (await res.json()) as OfficeState & { error?: string };
        if (!res.ok) {
          if (res.status === 401) {
            saveStoredToken(null);
            setToken(null);
            setUser(null);
          }
          setErrorMessage(data.error || 'Terjadi kesalahan pada server.');
          return false;
        }
        applyServerState(data);
        return true;
      } catch {
        setErrorMessage('Koneksi ke server terputus.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [applyServerState, token]
  );

  const occupy = useCallback((need: NeedType) => mutate('/api/occupy', { need }), [mutate]);

  const release = useCallback(
    (force = false) => mutate('/api/release', { force }),
    [mutate]
  );

  const joinQueue = useCallback(
    (need: NeedType) => mutate('/api/queue/join', { need }),
    [mutate]
  );

  const leaveQueue = useCallback(() => mutate('/api/queue/leave', {}), [mutate]);

  // --- Admin Panel Actions ---

  const fetchAdminUsers = useCallback(async (): Promise<void> => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { users?: AdminUserSummary[] };
      if (data.users) {
        setAdminUsers(data.users);
      }
    } catch {
      // ignore transient error
    }
  }, [token, user?.role]);

  const adminUpdateToilet = useCallback(
    (name: string, location: string) =>
      mutate('/api/admin/toilet', { name, location }, 'PATCH'),
    [mutate]
  );

  const adminToggleMaintenance = useCallback(
    () => mutate('/api/admin/toilet/maintenance', {}),
    [mutate]
  );

  const adminForceRelease = useCallback(
    () => mutate('/api/admin/toilet/force-release', {}),
    [mutate]
  );

  const adminPrioritizeQueue = useCallback(
    (queueId: string) => mutate(`/api/admin/queue/${encodeURIComponent(queueId)}/prioritize`, {}),
    [mutate]
  );

  const adminRemoveQueue = useCallback(
    (queueId: string) => mutate(`/api/admin/queue/${encodeURIComponent(queueId)}`, undefined, 'DELETE'),
    [mutate]
  );

  const adminClearQueue = useCallback(
    () => mutate('/api/admin/queue/clear', {}),
    [mutate]
  );

  const adminDeleteHistory = useCallback(
    async (historyId: string): Promise<boolean> => {
      const ok = await mutate(
        `/api/admin/history/${encodeURIComponent(historyId)}`,
        undefined,
        'DELETE'
      );
      if (ok) void fetchAdminUsers();
      return ok;
    },
    [mutate, fetchAdminUsers]
  );

  const adminUpdateUserRole = useCallback(
    async (userId: string, role: UserRole): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        });
        const data = (await res.json()) as { users?: AdminUserSummary[]; error?: string };
        if (!res.ok) {
          setErrorMessage(data.error || 'Gagal memperbarui peran akun.');
          return false;
        }
        if (data.users) setAdminUsers(data.users);
        return true;
      } catch {
        setErrorMessage('Koneksi ke server terputus.');
        return false;
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
        const res = await fetch(
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
        const data = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) {
          setErrorMessage(data.error || 'Gagal mereset password.');
          return null;
        }
        return data.message || 'Password berhasil direset.';
      } catch {
        setErrorMessage('Koneksi ke server terputus.');
        return null;
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
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          users?: AdminUserSummary[];
          state?: OfficeState;
          error?: string;
        };
        if (!res.ok) {
          setErrorMessage(data.error || 'Gagal menghapus akun.');
          return false;
        }
        if (data.users) setAdminUsers(data.users);
        if (data.state) applyServerState(data.state);
        return true;
      } catch {
        setErrorMessage('Koneksi ke server terputus.');
        return false;
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
      const res = await fetch('/api/admin/reset-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        users?: AdminUserSummary[];
        state?: OfficeState;
        error?: string;
      };
      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal mereset data demo.');
        return false;
      }
      if (data.users) setAdminUsers(data.users);
      if (data.state) applyServerState(data.state);
      return true;
    } catch {
      setErrorMessage('Koneksi ke server terputus.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [token, applyServerState]);

  return {
    state,
    user,
    demoAccounts,
    adminUsers,
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
    adminUpdateUserRole,
    adminResetUserPassword,
    adminDeleteUser,
    adminResetDemo,
  };
}
