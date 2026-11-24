import { BellRing, Sparkles, UserPlus, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  estimateWaitMinutes,
  formatDuration,
  getPublicDisplayName,
} from '../shared/queueLogic.ts';
import type {
  DailyQuotaInfo,
  HistoryEntry,
  NeedType,
  QueueEntry,
  Stall,
} from '../shared/types.ts';
import { PoopMiniIcon } from './PoopAnimations.tsx';

interface QueuePanelProps {
  toilet: Stall;
  queue: QueueEntry[];
  history: HistoryEntry[];
  currentUserId: string;
  selectedNeed: NeedType;
  now: number;
  busy: boolean;
  userAlreadyOccupying: boolean;
  dailyQuota?: DailyQuotaInfo;
  onJoinQueue: (need: NeedType) => void;
  onLeaveQueue: () => void;
  onClaimToilet: (need: NeedType) => void;
}

export function QueuePanel({
  toilet,
  queue,
  history,
  currentUserId,
  selectedNeed,
  now,
  busy,
  userAlreadyOccupying,
  dailyQuota,
  onJoinQueue,
  onLeaveQueue,
  onClaimToilet,
}: QueuePanelProps) {
  const myQueueEntry = queue.find((q) => q.userId === currentUserId) ?? null;
  const quotaExhausted = dailyQuota ? dailyQuota.remaining <= 0 : false;

  return (
    <section
      aria-labelledby="queue-panel-heading"
      className="flex flex-col rounded-3xl p-6 sm:p-7 glass-card transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="queue-panel-heading"
              className="font-display text-lg sm:text-xl font-black text-white"
            >
              Antrean Bilik
            </h2>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ad7c2b] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dbc08b]" />
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#dbc08b]/80">
            {queue.length === 0
              ? 'Bilik sepi, tidak ada yang mengantre'
              : `${queue.length} pejuang toilet sedang menunggu`}
          </p>
        </div>
        <span className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-black tabular-nums text-[#f5eedb]">
          <span>{queue.length}</span>
          <span className="font-sans font-medium text-[11px] text-[#dbc08b]">antre</span>
        </span>
      </div>

      {/* Turn Called Banner for Current User */}
      {myQueueEntry && myQueueEntry.status === 'called' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 rounded-2xl border border-teal-500/60 bg-gradient-to-r from-teal-950/70 to-[#241407]/70 p-4 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 text-slate-950 shadow-md">
              <BellRing className="h-4 w-4 animate-bounce" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-white">
                Giliran Kamu Tiba! Bilik Sudah Kosong
              </p>
              <p className="text-xs text-teal-200 font-medium">
                Masuk sebelum timer hangus:{' '}
                <span className="font-mono font-black tabular-nums text-teal-300 bg-teal-900/60 px-1.5 py-0.5 rounded border border-teal-500/30">
                  {formatDuration(Math.max(0, (myQueueEntry.expiresAt ?? now) - now))}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onClaimToilet(myQueueEntry.need)}
              className="btn-3d-teal min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-black text-white cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <span>Masuk Sekarang 🎯</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeaveQueue}
              className="glass-pill min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold text-[#e8d9b5] hover:text-white cursor-pointer whitespace-nowrap"
            >
              Lewati
            </button>
          </div>
        </motion.div>
      )}

      {/* Join Queue Button (when toilet busy or maintenance and user not queued) */}
      {!myQueueEntry && !userAlreadyOccupying && toilet.status !== 'available' && (
        <div className="mt-4 border-t border-[#c99f57]/15 pt-4">
          <button
            type="button"
            disabled={busy || quotaExhausted}
            onClick={() => onJoinQueue(selectedNeed)}
            className="btn-3d-poop inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {quotaExhausted
                ? 'Kuota Harian 10/10 Habis'
                : `Ambil Nomor Antrean (${selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})`}
            </span>
          </button>
        </div>
      )}

      {/* Waiting Status for Current User */}
      {myQueueEntry && myQueueEntry.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#c99f57]/40 bg-[#3e2610]/60 p-4 shadow-md backdrop-blur-md"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black bg-[#ad7c2b] text-white px-2 py-0.5 rounded-lg shadow-sm">
                #{queue.findIndex((q) => q.id === myQueueEntry.id) + 1}
              </span>
              <p className="text-sm font-bold text-white">
                Kamu Sedang Mengantre
              </p>
            </div>
            <p className="mt-1 text-xs text-[#dbc08b]/80">
              Keperluan: {myQueueEntry.need === 'pup' ? 'Pup (Santai) 💩' : 'Cepat (BAK) ⚡'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLeaveQueue}
            className="glass-pill inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#e8d9b5] hover:text-rose-300 hover:border-rose-500/40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <XCircle className="h-4 w-4 text-[#dbc08b]" aria-hidden="true" />
            <span>Batalkan</span>
          </button>
        </motion.div>
      )}

      {/* Ordered Queue List in Glass */}
      <div className="mt-4 border-t border-[#c99f57]/15 pt-3">
        {queue.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#241407]/60 border border-[#c99f57]/20 shadow-inner">
              <PoopMiniIcon className="h-7 w-7 text-[#dbc08b]" />
            </div>
            <p className="mt-3 text-sm font-bold text-white">
              Antrean Bersih & Lengang
            </p>
            <p className="mt-1 text-xs text-[#dbc08b]/70 max-w-xs mx-auto">
              Tidak ada antrean saat ini. Siapa cepat, dia yang berhak menikmati bilik toilet!
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-[#c99f57]/10" data-testid="queue-list">
            <AnimatePresence initial={false}>
              {queue.map((entry, idx) => {
                const isMe = entry.userId === currentUserId;
                const waitMs = Math.max(0, now - entry.joinedAt);
                const waitingIndex = queue
                  .filter((q) => q.status === 'waiting')
                  .findIndex((q) => q.id === entry.id);
                const estMinutes =
                  entry.status === 'called'
                    ? 0
                    : estimateWaitMinutes(
                        toilet,
                        queue,
                        history,
                        Math.max(0, waitingIndex),
                        now
                      );

                // 3D Glass Badge colors
                const rankBadgeClass =
                  idx === 0
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : idx === 1
                      ? 'bg-slate-300 text-slate-950 font-black shadow-sm'
                      : idx === 2
                        ? 'bg-[#ad7c2b] text-white font-black shadow-sm'
                        : 'bg-[#241407] text-[#dbc08b] border border-[#c99f57]/30';

                return (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className={`flex items-center justify-between gap-3 py-3 rounded-2xl px-3 transition-colors ${
                      isMe ? 'glass-pill my-1.5 border-[#c99f57]/50' : 'hover:bg-[#241407]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-mono text-xs tabular-nums h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white flex items-center gap-1.5">
                          <span>
                            {isMe
                              ? `${entry.displayName} (Kamu)`
                              : getPublicDisplayName(
                                  entry.displayName,
                                  entry.isAnonymous,
                                  entry.userId
                                )}
                          </span>
                          {isMe && (
                            <span className="rounded bg-[#ad7c2b] px-1.5 py-0.2 text-[9px] font-black text-white uppercase">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[#dbc08b]/70 flex items-center gap-1.5">
                          {entry.department ? (
                            <>
                              <span>{entry.department}</span>
                              <span>·</span>
                            </>
                          ) : null}
                          <span className="font-semibold text-[#e8d9b5]">
                            {entry.need === 'pup' ? 'Pup 💩' : 'Cepat ⚡'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.status === 'called' ? (
                        <span className="glass-pill inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-teal-300 border-teal-500/40">
                          <Sparkles className="h-3 w-3" />
                          <span>Dipanggil</span>
                        </span>
                      ) : (
                        <div>
                          <p className="font-mono text-xs font-black tabular-nums text-white">
                            {formatDuration(waitMs)}
                          </p>
                          <p className="text-[11px] tabular-nums text-[#dbc08b]/70 font-mono">
                            ~{estMinutes} mnt
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </section>
  );
}
