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
    <div className="min-h-screen bg-[#0c0c0e] text-white flex flex-col">
      <PoopInteractionBurst event={burstEvent} />

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b-2 border-white bg-black px-4 pt-safe sm:px-8 shadow-[0_4px_0px_#000000]">
        <div className="flex items-center gap-2.5 text-sm min-w-0">
          <img src="/app-logo.png" alt="Ngising" className="h-7 w-7 rounded object-contain border border-white" />
          <span className="font-display font-black text-white uppercase tracking-tight whitespace-nowrap">
            NGISING P5
          </span>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-black uppercase text-white truncate">
            MODE TAMU
          </h1>
          <span className="p5-badge bg-[#e60012] text-white px-2 py-0.5 text-[10px] font-black border border-white">
            <span className="transform skew-x-[6deg] inline-block">GUEST</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Klik untuk menyinkronkan status"
              className="p5-badge inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1 text-xs font-black uppercase text-white bg-black border border-white shadow-[2px_2px_0px_#000000] hover:bg-[#e60012] transition-colors cursor-pointer whitespace-nowrap active:scale-95"
            >
              <span className="inline-flex items-center gap-1.5 transform skew-x-[6deg]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e60012] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e60012]" />
                </span>
                <span className="font-mono text-[11px] font-black">
                  {lastSyncedAt ? formatLastSynced(lastSyncedAt, now) : 'LIVE'}
                </span>
                <RefreshCw
                  className={`h-3 w-3 text-white transition-transform ${
                    isSyncing ? 'animate-spin' : ''
                  }`}
                />
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-bold uppercase whitespace-nowrap">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="tabular-nums font-mono font-black">
                  {officeState?.onlineCount ?? 1} ONLINE
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[#e60012]" />
                <span className="text-[#ff4d4d] font-black">CONNECTING...</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onExitGuest}
            className="p5-btn-black inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase text-white hover:text-[#ff4d4d] transition-all whitespace-nowrap cursor-pointer active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>KELUAR TAMU</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-12 sm:px-8 lg:py-8">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 border-2 border-white bg-[#e60012] p-4 text-sm font-black text-white shadow-[4px_4px_0px_#000000] uppercase"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={onClearError}
              className="p5-btn-black text-xs px-2.5 py-1 text-white cursor-pointer"
            >
              TUTUP
            </button>
          </div>
        )}

        {/* Compact Guest Information Card */}
        <div className="p5-panel mb-6 flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-black border-2 border-white shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center bg-[#e60012] text-white border border-white shrink-0 shadow-[2px_2px_0px_#000000]">
              <BookOpenCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs sm:text-sm font-black uppercase text-white">
                TAMU: <span className="text-[#ff4d4d]">{guest.displayName}</span>
                {guest.origin ? ` · ${guest.origin}` : ''}
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase truncate">
                {guestAlreadyOccupying
                  ? 'Sedang menggunakan bilik'
                  : guestQueueIndex !== -1
                    ? `Sedang di nomor antrean #${guestQueueIndex + 1}`
                    : 'Siap menggunakan bilik atau ambil nomor antrean'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="p5-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase text-white bg-black border border-white shadow-[2px_2px_0px_#000000]">
              <span className="inline-flex items-center gap-1 transform skew-x-[6deg]">
                <span className="text-[11px] text-slate-400">KUOTA SISA:</span>
                <span className="font-mono font-black text-white">
                  {dailyQuota?.remaining ?? 10}X
                </span>
              </span>
            </span>
          </div>
        </div>

        {!toilet ? (
          <div className="h-64 animate-pulse border-2 border-white bg-black shadow-[4px_4px_0px_#000000]" />
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
