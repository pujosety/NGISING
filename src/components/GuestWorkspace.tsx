import { AlertCircle, BookOpenCheck, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { getDailyQuota } from '../shared/queueLogic.ts';
import type { GuestSession, NeedType, OfficeState } from '../shared/types.ts';
import { PoopInteractionBurst, type PoopBurstEvent } from './PoopAnimations.tsx';
import { QueuePanel } from './QueuePanel.tsx';
import { StallCard } from './StallCard.tsx';

function formatLastSynced(timestamp: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 3) return 'Baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  return `${Math.floor(diffSec / 60)}m lalu`;
}

interface GuestWorkspaceProps {
  guest: GuestSession;
  officeState: OfficeState | null;
  connected: boolean;
  busy: boolean;
  now: number;
  lastSyncedAt?: number;
  isSyncing?: boolean;
  onRefresh?: () => void;
  selectedNeed: NeedType;
  onSelectNeed: (need: NeedType) => void;
  errorMessage: string | null;
  burstEvent: PoopBurstEvent | null;
  onClearError: () => void;
  onOccupy: (need: NeedType) => void;
  onRelease: (force?: boolean) => void;
  onJoinQueue: (need: NeedType) => void;
  onLeaveQueue: () => void;
  onExitGuest: () => void;
}

export function GuestWorkspace({
  guest,
  officeState,
  connected,
  busy,
  now,
  lastSyncedAt,
  isSyncing,
  onRefresh,
  selectedNeed,
  onSelectNeed,
  errorMessage,
  burstEvent,
  onClearError,
  onOccupy,
  onRelease,
  onJoinQueue,
  onLeaveQueue,
  onExitGuest,
}: GuestWorkspaceProps) {
  const toilet = officeState?.toilet;
  const queue = officeState?.queue ?? [];
  const history = officeState?.history ?? [];

  const guestAlreadyOccupying = toilet?.occupant?.userId === guest.id;
  const guestQueueIndex = queue.findIndex((q) => q.userId === guest.id);
  const dailyQuota = officeState
    ? getDailyQuota(officeState, guest.id, now)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <PoopInteractionBurst event={burstEvent} />

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 pt-safe backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-2.5 text-sm min-w-0">
          <img src="/app-logo.png" alt="Ngising" className="h-7 w-7 rounded-md object-contain shadow-2xs" />
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
            Ngising
          </span>
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            Mode Tamu
          </h1>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Auto-Refresh Badge */}
          {onRefresh && (
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
                onRefresh();
              }}
              title="Klik untuk menyinkronkan status secara instan"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-teal-200/90 bg-teal-50/70 px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100/80 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <span className="hidden xs:inline">Auto-Refresh:</span>
              <span className="font-mono text-[11px] font-bold text-teal-800">
                {lastSyncedAt ? formatLastSynced(lastSyncedAt, now) : 'Aktif'}
              </span>
              <RefreshCw
                className={`h-3 w-3 text-teal-700 transition-transform ${
                  isSyncing ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="tabular-nums">
                  {officeState?.onlineCount ?? 1} layar aktif
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
            onClick={onExitGuest}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Keluar Tamu</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-8 lg:py-8">
        <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              <span>Terdaftar di Buku Tamu ({guest.origin})</span>
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              Halo, {guest.displayName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Kamu dapat memantau ketersediaan toilet kantor dan mengambil antrean secara langsung tanpa login akun.
            </p>
          </div>
          {dailyQuota && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs font-medium text-slate-500">Kuota Harian</p>
              <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                {dailyQuota.used} / {dailyQuota.limit}
              </p>
            </div>
          )}
        </section>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={onClearError}
              className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {!toilet ? (
          <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <StallCard
                toilet={toilet}
                currentUserId={guest.id}
                isAdmin={false}
                selectedNeed={selectedNeed}
                onSelectNeed={onSelectNeed}
                now={now}
                busy={busy}
                userAlreadyQueued={guestQueueIndex !== -1}
                dailyQuota={dailyQuota}
                onOccupy={onOccupy}
                onRelease={onRelease}
                onJoinQueue={onJoinQueue}
              />
            </div>

            <div className="lg:col-span-5">
              <QueuePanel
                toilet={toilet}
                queue={queue}
                history={history}
                currentUserId={guest.id}
                selectedNeed={selectedNeed}
                now={now}
                busy={busy}
                userAlreadyOccupying={guestAlreadyOccupying}
                dailyQuota={dailyQuota}
                onJoinQueue={onJoinQueue}
                onLeaveQueue={onLeaveQueue}
                onClaimToilet={onOccupy}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
