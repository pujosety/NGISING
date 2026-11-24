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
    <div className="min-h-screen text-[#f7efe6] flex flex-col">
      <PoopInteractionBurst event={burstEvent} />

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#c99f57]/20 glass-panel px-4 pt-safe sm:px-8">
        <div className="flex items-center gap-2.5 text-sm min-w-0">
          <img src="/app-logo.png" alt="Ngising" className="h-7 w-7 rounded-md object-contain drop-shadow-md" />
          <span className="font-display text-lg font-black tracking-tight text-white whitespace-nowrap">
            Ngising
          </span>
          <span className="text-[#c99f57]/40" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-bold text-white truncate">
            Mode Tamu
          </h1>
          <span className="rounded-full bg-[#ad7c2b]/30 text-[#e8d9b5] border border-[#c99f57]/30 px-2 py-0.5 text-[10px] font-bold">
            GUEST
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Klik untuk menyinkronkan status"
              className="glass-pill inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#e8d9b5] hover:border-[#c99f57] hover:text-white transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ad7c2b] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dbc08b]" />
              </span>
              <span className="font-mono text-[11px] font-bold text-[#dbc08b]">
                {lastSyncedAt ? formatLastSynced(lastSyncedAt, now) : 'Live'}
              </span>
              <RefreshCw
                className={`h-3 w-3 text-[#dbc08b] transition-transform ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#dbc08b]/80 whitespace-nowrap">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="tabular-nums font-mono font-bold">
                  {officeState?.onlineCount ?? 1} online
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">Menyambung...</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onExitGuest}
            className="glass-pill inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-950/60 hover:border-rose-500/40 transition-all whitespace-nowrap cursor-pointer active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Tamu</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-12 sm:px-8 lg:py-8">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-200 shadow-lg"
          >
            <span className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={onClearError}
              className="text-xs font-bold text-rose-300 hover:underline whitespace-nowrap cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Compact Guest Information Card */}
        <div className="mb-6 glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 border border-[#c99f57]/25">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ad7c2b]/30 text-[#e8d9b5] border border-[#c99f57]/30 shrink-0">
              <BookOpenCheck className="h-4 w-4 text-[#dbc08b]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                Tamu: <span className="text-[#dbc08b]">{guest.displayName}</span>
                {guest.origin ? ` · ${guest.origin}` : ''}
              </p>
              <p className="text-[11px] text-[#dbc08b]/70 truncate">
                {guestAlreadyOccupying
                  ? 'Sedang menggunakan bilik'
                  : guestQueueIndex !== -1
                    ? `Sedang di nomor antrean #${guestQueueIndex + 1}`
                    : 'Siap menggunakan bilik atau ambil nomor antrean'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="glass-pill inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#e8d9b5]">
              <span className="text-[11px] text-[#dbc08b]/80">Kuota Sisa:</span>
              <span className="font-mono font-bold text-white">
                {dailyQuota?.remaining ?? 10}x
              </span>
            </span>
          </div>
        </div>

        {!toilet ? (
          <div className="h-64 animate-pulse rounded-2xl border border-[#c99f57]/20 glass-card" />
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
