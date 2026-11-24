import { AlertCircle, Award, EyeOff, Medal, RefreshCw, Trophy, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanelView } from './components/AdminPanelView.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { DisplayMonitorView } from './components/DisplayMonitorView.tsx';
import { GuestWorkspace } from './components/GuestWorkspace.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import {
  PoopInteractionBurst,
  PoopMascot,
  type PoopBurstEvent,
  type PoopBurstKind,
} from './components/PoopAnimations.tsx';
import { QueuePanel } from './components/QueuePanel.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { Sidebar, type WorkspaceTab } from './components/Sidebar.tsx';
import { StallCard } from './components/StallCard.tsx';
import { StatsView } from './components/StatsView.tsx';
import { useOfficeQueue } from './hooks/useOfficeQueue.ts';
import {
  computePersonalStats,
  computeWeeklyLeaderboard,
  formatDuration,
  getDailyQuota,
} from './shared/queueLogic.ts';
import type { NeedType } from './shared/types.ts';
import { soundEffects } from './utils/soundEffects.ts';

const TAB_TITLES: Record<WorkspaceTab, string> = {
  dashboard: 'Dashboard Saya',
  display: 'Layar Monitor (TV)',
  history: 'Riwayat & Log',
  stats: 'Statistik',
  account: 'Akun Saya',
  admin: 'Admin Panel',
};

function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLastSynced(timestamp: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 3) return 'Baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  return `${Math.floor(diffSec / 60)}m lalu`;
}

export default function App() {
  const {
    state,
    user,
    guest,
    adminUsers,
    adminGuestbook,
    isLocalFallback,
    loading,
    authLoading,
    connected,
    busy,
    errorMessage,
    clearError,
    lastSyncedAt,
    isSyncing,
    refreshState,
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
  } = useOfficeQueue();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'tv' || params.get('display') === '1' || params.get('kiosk') === '1') {
        return 'display';
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [selectedNeed, setSelectedNeed] = useState<NeedType>('pup');
  const [burstEvent, setBurstEvent] = useState<PoopBurstEvent | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  const triggerBurst = useCallback((kind: PoopBurstKind) => {
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    setBurstEvent({ id: Date.now(), kind });
    burstTimerRef.current = window.setTimeout(() => {
      setBurstEvent(null);
    }, 1500);
  }, []);

  const handleOccupy = useCallback(
    async (need: NeedType) => {
      const ok = await occupy(need);
      if (ok) {
        soundEffects.playPlop();
        triggerBurst('occupy');
      }
    },
    [occupy, triggerBurst]
  );

  const handleRelease = useCallback(
    async (force = false) => {
      const ok = await release(force);
      if (ok) {
        soundEffects.playFlush();
        triggerBurst('release');
      }
    },
    [release, triggerBurst]
  );

  const handleJoinQueue = useCallback(
    async (need: NeedType) => {
      const ok = await joinQueue(need);
      if (ok) {
        soundEffects.playPop();
        triggerBurst('queue');
      }
    },
    [joinQueue, triggerBurst]
  );

  const handleLeaveQueue = useCallback(async () => {
    const ok = await leaveQueue();
    if (ok) {
      soundEffects.playPop();
      triggerBurst('leave');
    }
  }, [leaveQueue, triggerBurst]);

  const isAdmin = user?.role === 'admin';
  const safeActiveTab: WorkspaceTab =
    activeTab === 'admin' && !isAdmin ? 'dashboard' : activeTab;

  useEffect(() => {
    if (isAdmin && safeActiveTab === 'admin') {
      void fetchAdminUsers();
    }
  }, [isAdmin, safeActiveTab, state?.serverNow, fetchAdminUsers]);

  const personalStats = useMemo(() => {
    if (!state || !user) return null;
    return computePersonalStats(state.history, user.id, now);
  }, [state, user, now]);

  const weeklySummary = useMemo(() => {
    if (!state) return null;
    return computeWeeklyLeaderboard(state.history, now);
  }, [state, now]);

  const myDailyQuota = useMemo(() => {
    if (!state || !user) return undefined;
    return getDailyQuota(state, user.id, now);
  }, [state, user, now]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="space-y-2 text-center">
          <p className="font-display text-lg font-bold text-slate-900">Ngising</p>
          <p className="text-sm text-slate-500">Memuat status toilet kantor...</p>
        </div>
      </div>
    );
  }

  if (!user && guest) {
    return (
      <GuestWorkspace
        guest={guest}
        officeState={state}
        connected={connected}
        busy={busy}
        now={now}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        onRefresh={refreshState}
        selectedNeed={selectedNeed}
        onSelectNeed={setSelectedNeed}
        errorMessage={errorMessage}
        burstEvent={burstEvent}
        onClearError={clearError}
        onOccupy={handleOccupy}
        onRelease={handleRelease}
        onJoinQueue={handleJoinQueue}
        onLeaveQueue={handleLeaveQueue}
        onExitGuest={exitGuest}
      />
    );
  }

  if (activeTab === 'display' && !user) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 sm:p-8 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            ← Kembali ke Halaman Masuk
          </button>
        </div>
        <DisplayMonitorView
          officeState={state}
          now={now}
          connected={connected}
          lastSyncedAt={lastSyncedAt}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        officeState={state}
        authLoading={authLoading}
        errorMessage={errorMessage}
        isLocalFallback={isLocalFallback}
        now={now}
        onClearError={clearError}
        onOpenDisplay={() => setActiveTab('display')}
        onLogin={login}
        onRegister={register}
        onGuestCheckIn={checkInGuest}
      />
    );
  }

  const toilet = state?.toilet;
  const queue = state?.queue ?? [];
  const history = state?.history ?? [];

  const userAlreadyOccupying = toilet?.occupant?.userId === user.id;
  const myQueueIndex = queue.findIndex((q) => q.userId === user.id);

  let myPersonalStatusLabel = 'Siap Pakai';
  let myPersonalStatusColor = 'text-emerald-700';
  if (userAlreadyOccupying) {
    myPersonalStatusLabel = 'Sedang di Dalam';
    myPersonalStatusColor = 'text-amber-700';
  } else if (myQueueIndex !== -1) {
    const entry = queue[myQueueIndex];
    if (entry.status === 'called') {
      myPersonalStatusLabel = 'Giliran Kamu!';
      myPersonalStatusColor = 'text-teal-700';
    } else {
      myPersonalStatusLabel = `Antrean #${myQueueIndex + 1}`;
      myPersonalStatusColor = 'text-slate-900';
    }
  } else if (toilet?.status === 'occupied') {
    myPersonalStatusLabel = 'Toilet Terisi';
    myPersonalStatusColor = 'text-amber-700';
  } else if (toilet?.status === 'maintenance') {
    myPersonalStatusLabel = 'Perawatan';
    myPersonalStatusColor = 'text-slate-500';
  }

  if (safeActiveTab === 'display') {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-[#0B0F17] text-slate-100 overflow-hidden select-none">
        <DisplayMonitorView
          officeState={state}
          now={now}
          connected={connected}
          lastSyncedAt={lastSyncedAt}
          onExit={() => setActiveTab('dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-[#f7efe6]">
      <PoopInteractionBurst event={burstEvent} />
      <Sidebar
        activeTab={safeActiveTab}
        onSelectTab={setActiveTab}
        user={user}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          soundEffects.enabled = next;
          setSoundEnabled(next);
        }}
        onLogout={logout}
        queueCount={queue.length}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#c99f57]/20 glass-panel px-4 pt-safe sm:px-8">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <img src="/app-logo.png" alt="Ngising" className="h-7 w-7 rounded-md object-contain lg:hidden drop-shadow-md" />
            <span className="font-display font-extrabold text-white whitespace-nowrap lg:hidden">
              Ngising
            </span>
            <span className="text-[#c99f57]/40 lg:hidden" aria-hidden="true">
              /
            </span>
            <span className="hidden text-[#dbc08b] lg:inline whitespace-nowrap">
              {user.displayName}
            </span>
            <span className="hidden text-[#c99f57]/40 lg:inline" aria-hidden="true">
              /
            </span>
            <h1 className="font-display font-bold text-white truncate">
              {TAB_TITLES[safeActiveTab]}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Auto-Refresh & Live Sync Status Badge / Action */}
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate(10);
                  } catch {
                    // ignore
                  }
                }
                void refreshState();
              }}
              title="Klik untuk menyinkronkan status secara instan"
              className="glass-pill inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#e8d9b5] hover:border-[#c99f57] hover:text-white transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ad7c2b] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dbc08b]" />
              </span>
              <span className="hidden xs:inline">Auto-Refresh:</span>
              <span className="font-mono text-[11px] font-bold text-[#dbc08b]">
                {formatLastSynced(lastSyncedAt, now)}
              </span>
              <RefreshCw
                className={`h-3 w-3 text-[#dbc08b] transition-transform ${
                  isSyncing ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#dbc08b]/80 whitespace-nowrap">
              {connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="tabular-nums font-mono font-bold">
                    {state?.onlineCount ?? 1} online
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span className="text-amber-300 font-medium">Menyambung...</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="glass-pill inline-flex min-h-[36px] items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-[#f5eedb] hover:border-[#c99f57] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user.displayName}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-8 lg:py-8 lg:pb-10">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-200 shadow-lg"
            >
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{errorMessage}</span>
              </span>
              <button
                type="button"
                onClick={clearError}
                className="text-xs font-bold text-rose-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {!toilet ? (
            <div className="h-64 animate-pulse rounded-2xl border border-[#c99f57]/20 glass-card" />
          ) : safeActiveTab === 'dashboard' ? (
            <div className="space-y-4">
              {/* Compact Quick Status Bar Glass */}
              <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 border border-[#c99f57]/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      userAlreadyOccupying
                        ? 'bg-rose-500 animate-pulse'
                        : myQueueIndex !== -1
                          ? 'bg-[#ad7c2b] animate-pulse'
                          : 'bg-emerald-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-white truncate">
                    {userAlreadyOccupying
                      ? 'Kamu sedang di dalam bilik'
                      : myQueueIndex !== -1
                        ? `Kamu di nomor antrean #${myQueueIndex + 1}`
                        : `Halo, ${user.displayName}!`}
                  </span>
                  {user.isAnonymous && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#3e2610] px-1.5 py-0.5 text-[10px] text-[#dbc08b] font-bold border border-[#c99f57]/30">
                      <EyeOff className="h-2.5 w-2.5" />
                      <span>Anonim</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="glass-pill inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#e8d9b5]">
                    <span className="text-[11px] text-[#dbc08b]/80">Kuota Sisa:</span>
                    <span
                      className={`font-mono font-bold ${
                        myDailyQuota && myDailyQuota.remaining <= 0
                          ? 'text-rose-400'
                          : 'text-white'
                      }`}
                    >
                      {myDailyQuota?.remaining ?? 10}/10
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
                    <span className="text-[11px] font-normal text-teal-600">Antre:</span>
                    <span className="font-mono">{queue.length}</span>
                  </span>
                </div>
              </div>

              {/* Main 1-Toilet Live Card + Live Queue */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                <div className="lg:col-span-7">
                  <StallCard
                    toilet={toilet}
                    currentUserId={user.id}
                    isAdmin={isAdmin}
                    selectedNeed={selectedNeed}
                    onSelectNeed={setSelectedNeed}
                    now={now}
                    busy={busy}
                    userAlreadyQueued={myQueueIndex !== -1}
                    dailyQuota={myDailyQuota}
                    onOccupy={handleOccupy}
                    onRelease={handleRelease}
                    onJoinQueue={handleJoinQueue}
                  />
                </div>

                <div className="lg:col-span-5">
                  <QueuePanel
                    toilet={toilet}
                    queue={queue}
                    history={history}
                    currentUserId={user.id}
                    selectedNeed={selectedNeed}
                    now={now}
                    busy={busy}
                    userAlreadyOccupying={userAlreadyOccupying}
                    dailyQuota={myDailyQuota}
                    onJoinQueue={handleJoinQueue}
                    onLeaveQueue={handleLeaveQueue}
                    onClaimToilet={handleOccupy}
                  />
                </div>
              </div>

              {/* Personal Recent Sessions + Weekly Leaderboard Preview */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                <section
                  aria-labelledby="personal-recent-heading"
                  className="glass-card overflow-hidden rounded-2xl border border-[#c99f57]/20 lg:col-span-7"
                >
                <div className="flex items-center justify-between border-b border-[#c99f57]/15 px-5 py-4">
                  <div>
                    <h3
                      id="personal-recent-heading"
                      className="font-display text-base font-bold text-white"
                    >
                      Aktivitas Terakhir Saya
                    </h3>
                    <p className="mt-0.5 text-xs text-[#f3e4c0]/80">
                      Catatan pribadi khusus untuk akun {user.displayName}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-[#f3e4c0] hover:text-white hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                {!personalStats || personalStats.recentSessions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-[#f3e4c0]/70">
                    Belum ada catatan sesi pribadimu hari ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#e0b666]/20 bg-[#1f1106]/80 text-xs font-bold text-[#f3e4c0]">
                          <th className="px-5 py-2.5">Keperluan</th>
                          <th className="px-5 py-2.5 text-right">Mulai</th>
                          <th className="px-5 py-2.5 text-right">Selesai</th>
                          <th className="px-5 py-2.5 text-right">Durasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0b666]/10">
                        {personalStats.recentSessions.map((item) => (
                          <tr key={item.id} className="hover:bg-[#3b220d]/40 transition-colors">
                            <td className="px-5 py-3">
                              <span
                                className={`text-xs font-bold ${
                                  item.need === 'pup' ? 'text-[#f3e4c0]' : 'text-teal-300'
                                }`}
                              >
                                {item.need === 'pup' ? '💩 Pup (Santai)' : '⚡ Cepat (BAK)'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-white/90">
                              {formatTimeOnly(item.startedAt)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-white/90">
                              {formatTimeOnly(item.endedAt)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs font-bold tabular-nums text-white">
                              {formatDuration(item.durationMs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

                {/* Top 3 Leaderboard Mingguan Preview */}
                <section
                  aria-labelledby="dashboard-weekly-heading"
                  className="glass-card overflow-hidden rounded-2xl border border-[#c99f57]/20 lg:col-span-5"
                >
                  <div className="flex items-center justify-between border-b border-[#c99f57]/15 px-5 py-4">
                    <div>
                      <h3
                        id="dashboard-weekly-heading"
                        className="font-display text-base font-bold text-white"
                      >
                        Leaderboard Mingguan
                      </h3>
                      <p className="mt-0.5 text-xs text-[#f3e4c0]/80">
                        {weeklySummary?.weekRangeLabel ?? '7 hari terakhir'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('stats')}
                      className="text-xs font-bold text-[#f3e4c0] hover:text-white hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Lihat Lengkap
                    </button>
                  </div>

                  {!weeklySummary || weeklySummary.entries.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-[#f3e4c0]/70">
                      Belum ada sesi minggu ini.
                    </div>
                  ) : (
                    <ol className="divide-y divide-[#e0b666]/10">
                      {weeklySummary.entries.slice(0, 3).map((entry, idx) => {
                        const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
                        const rankColor =
                          idx === 0
                            ? 'text-amber-400'
                            : idx === 1
                              ? 'text-slate-200'
                              : 'text-[#e0b666]';
                        return (
                          <li
                            key={entry.userId}
                            className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#3b220d]/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <RankIcon className={`h-4 w-4 shrink-0 ${rankColor}`} aria-hidden="true" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">
                                  {entry.userId === user.id
                                    ? `${user.displayName} (Kamu)`
                                    : entry.displayName}
                                </p>
                                <p className="text-xs text-[#f3e4c0]/80 tabular-nums">
                                  {entry.pupSessions} Pup <span aria-hidden="true">·</span>{' '}
                                  {entry.cepatSessions} Cepat
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono text-sm font-black tabular-nums text-white">
                                {entry.totalSessions}x
                              </p>
                              <p className="font-mono text-[11px] tabular-nums text-[#f3e4c0]">
                                {formatDuration(entry.totalDurationMs)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              </div>
            </div>
          ) : safeActiveTab === 'history' ? (
            <HistoryView history={history} currentUserId={user.id} />
          ) : safeActiveTab === 'stats' ? (
            <StatsView history={history} user={user} now={now} />
          ) : safeActiveTab === 'admin' && isAdmin && state ? (
            <AdminPanelView
              key={`${toilet.id}-${toilet.name}-${toilet.location}`}
              officeState={state}
              currentUserId={user.id}
              users={adminUsers}
              guestbook={adminGuestbook}
              now={now}
              busy={busy}
              onUpdateToilet={adminUpdateToilet}
              onToggleMaintenance={adminToggleMaintenance}
              onForceRelease={adminForceRelease}
              onPrioritizeQueue={adminPrioritizeQueue}
              onRemoveQueue={adminRemoveQueue}
              onClearQueue={adminClearQueue}
              onUpdateUserRole={adminUpdateUserRole}
              onResetUserPassword={adminResetUserPassword}
              onDeleteUser={adminDeleteUser}
              onDeleteHistory={adminDeleteHistory}
              onDeleteGuestbook={adminDeleteGuestbook}
              onResetDemo={adminResetDemo}
            />
          ) : (
            <SettingsView
              key={`${user.id}-${user.displayName}-${user.department}-${user.isAnonymous}`}
              user={user}
              busy={busy}
              onUpdateProfile={updateProfile}
              onOpenAdminPanel={isAdmin ? () => setActiveTab('admin') : undefined}
              onLogout={logout}
            />
          )}
        </main>
      </div>
    </div>
  );
}
