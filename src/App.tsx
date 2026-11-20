import { AlertCircle, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminPanelView } from './components/AdminPanelView.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { QueuePanel } from './components/QueuePanel.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { Sidebar, type WorkspaceTab } from './components/Sidebar.tsx';
import { StallCard } from './components/StallCard.tsx';
import { StatsView } from './components/StatsView.tsx';
import { useOfficeQueue } from './hooks/useOfficeQueue.ts';
import {
  computePersonalStats,
  formatDuration,
  formatMinutesLabel,
} from './shared/queueLogic.ts';
import type { NeedType } from './shared/types.ts';

const TAB_TITLES: Record<WorkspaceTab, string> = {
  dashboard: 'Dashboard Saya',
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

export default function App() {
  const {
    state,
    user,
    demoAccounts,
    adminUsers,
    loading,
    authLoading,
    connected,
    busy,
    errorMessage,
    clearError,
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
  } = useOfficeQueue();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [selectedNeed, setSelectedNeed] = useState<NeedType>('pup');

  const isAdmin = user?.role === 'admin';
  const safeActiveTab: WorkspaceTab =
    activeTab === 'admin' && !isAdmin ? 'dashboard' : activeTab;

  useEffect(() => {
    if (isAdmin && safeActiveTab === 'admin') {
      void fetchAdminUsers();
    }
  }, [isAdmin, safeActiveTab, fetchAdminUsers]);

  const personalStats = useMemo(() => {
    if (!state || !user) return null;
    return computePersonalStats(state.history, user.id, now);
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

  if (!user) {
    return (
      <AuthScreen
        officeState={state}
        demoAccounts={demoAccounts}
        authLoading={authLoading}
        errorMessage={errorMessage}
        now={now}
        onClearError={clearError}
        onLogin={login}
        onRegister={register}
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={safeActiveTab}
        onSelectTab={setActiveTab}
        user={user}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onLogout={logout}
        queueCount={queue.length}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="font-display font-extrabold text-slate-900 whitespace-nowrap lg:hidden">
              Ngising
            </span>
            <span className="text-slate-300 lg:hidden" aria-hidden="true">
              /
            </span>
            <span className="hidden text-slate-500 lg:inline whitespace-nowrap">
              {user.displayName}
            </span>
            <span className="hidden text-slate-300 lg:inline" aria-hidden="true">
              /
            </span>
            <h1 className="font-display font-semibold text-slate-900 truncate">
              {TAB_TITLES[safeActiveTab]}
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              {connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="tabular-nums">
                    {state?.onlineCount ?? 1} layar aktif
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span>Menyambung...</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user.displayName}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-8 lg:py-8 lg:pb-10">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </span>
              <button
                type="button"
                onClick={clearError}
                className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {!toilet ? (
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ) : safeActiveTab === 'dashboard' ? (
            <div className="space-y-6">
              {/* Personal Welcome Header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                    Dashboard {user.displayName}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {isAdmin ? 'Admin Kantor' : user.department || 'Karyawan Kantor'}
                    {user.isAnonymous ? (
                      <span className="inline-flex items-center gap-1 ml-1.5">
                        <span aria-hidden="true">·</span>
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Mode Samaran Aktif</span>
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* Personal 4-Column KPI Strip */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-slate-500">Status Saya</p>
                  <p className={`mt-1.5 font-display text-xl font-bold ${myPersonalStatusColor}`}>
                    {myPersonalStatusLabel}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-slate-500">Sesi Saya Hari Ini</p>
                  <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {personalStats?.todaySessions ?? 0}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-slate-500">Rata-rata Pup Saya</p>
                  <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {personalStats && personalStats.avgPupMs > 0
                      ? formatMinutesLabel(personalStats.avgPupMs)
                      : '-'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-slate-500">Antrean Toilet</p>
                  <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
                    {queue.length}
                    <span className="ml-1 text-sm font-normal text-slate-500">orang</span>
                  </p>
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
                    onOccupy={occupy}
                    onRelease={release}
                    onJoinQueue={joinQueue}
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
                    onJoinQueue={joinQueue}
                    onLeaveQueue={leaveQueue}
                    onClaimToilet={occupy}
                  />
                </div>
              </div>

              {/* Personal Recent Sessions on Dashboard */}
              <section
                aria-labelledby="personal-recent-heading"
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3
                      id="personal-recent-heading"
                      className="font-display text-base font-bold text-slate-900"
                    >
                      Aktivitas Terakhir Saya
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Catatan pribadi khusus untuk akun {user.displayName}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap"
                  >
                    Lihat Semua
                  </button>
                </div>

                {!personalStats || personalStats.recentSessions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-slate-500">
                    Belum ada catatan sesi pribadimu hari ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                          <th className="px-5 py-2.5">Keperluan</th>
                          <th className="px-5 py-2.5 text-right">Mulai</th>
                          <th className="px-5 py-2.5 text-right">Selesai</th>
                          <th className="px-5 py-2.5 text-right">Durasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {personalStats.recentSessions.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3">
                              <span
                                className={`text-xs font-semibold ${
                                  item.need === 'pup' ? 'text-amber-700' : 'text-teal-700'
                                }`}
                              >
                                {item.need === 'pup' ? 'Pup (Santai)' : 'Cepat (BAK)'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                              {formatTimeOnly(item.startedAt)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                              {formatTimeOnly(item.endedAt)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                              {formatDuration(item.durationMs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
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
