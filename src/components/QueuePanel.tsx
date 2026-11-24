import { BellRing, Clock, Sparkles, UserPlus, XCircle } from 'lucide-react';
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
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="queue-panel-heading"
              className="font-display text-lg font-extrabold text-slate-900"
            >
              Antrean Bilik
            </h2>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {queue.length === 0
              ? 'Bilik sepi, tidak ada yang mengantre'
              : `${queue.length} pejuang toilet sedang menunggu`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-mono text-xs font-bold tabular-nums text-teal-800">
          <span>{queue.length}</span>
          <span className="font-sans font-medium text-[11px]">antre</span>
        </span>
      </div>

      {/* Turn Called Banner for Current User */}
      {myQueueEntry && myQueueEntry.status === 'called' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 rounded-xl border border-teal-500 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow-xs">
              <BellRing className="h-4 w-4 animate-bounce" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-teal-950">
                Giliran Kamu Tiba! Bilik Sudah Kosong
              </p>
              <p className="text-xs text-teal-800 font-medium">
                Masuk sebelum timer hangus:{' '}
                <span className="font-mono font-extrabold tabular-nums text-teal-900 bg-teal-200/60 px-1.5 py-0.5 rounded">
                  {formatDuration(Math.max(0, (myQueueEntry.expiresAt ?? now) - now))}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              disabled={busy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onClaimToilet(myQueueEntry.need)}
              className="min-h-[42px] flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-md hover:from-teal-700 hover:to-emerald-700 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <span>Masuk Sekarang 🎯</span>
            </motion.button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeaveQueue}
              className="min-h-[42px] rounded-xl border border-teal-200 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Lewati
            </button>
          </div>
        </motion.div>
      )}

      {/* Join Queue Button (when toilet busy or maintenance and user not queued) */}
      {!myQueueEntry && !userAlreadyOccupying && toilet.status !== 'available' && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <motion.button
            type="button"
            disabled={busy || quotaExhausted}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoinQueue(selectedNeed)}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {quotaExhausted
                ? 'Kuota Harian 10/10 Habis'
                : `Ambil Nomor Antrean (${selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})`}
            </span>
          </motion.button>
        </div>
      )}

      {/* Waiting Status for Current User */}
      {myQueueEntry && myQueueEntry.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 shadow-xs"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold bg-teal-600 text-white px-2 py-0.5 rounded-md">
                #{queue.findIndex((q) => q.id === myQueueEntry.id) + 1}
              </span>
              <p className="text-sm font-bold text-slate-900">
                Kamu Sedang Mengantre
              </p>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Keperluan: {myQueueEntry.need === 'pup' ? 'Pup (Santai) 💩' : 'Cepat (BAK) ⚡'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLeaveQueue}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <XCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Batalkan</span>
          </button>
        </motion.div>
      )}

      {/* Ordered Queue List */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        {queue.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <PoopMiniIcon className="h-6 w-6 opacity-60" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">
              Antrean Bersih & Lengang
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              Tidak ada antrean saat ini. Siapa cepat, dia yang berhak menikmati singgasana toilet!
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100" data-testid="queue-list">
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

                // Badge colors for top queue positions
                const rankBadgeClass =
                  idx === 0
                    ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500/30'
                    : idx === 1
                      ? 'bg-slate-200 text-slate-800'
                      : idx === 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600';

                return (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className={`flex items-center justify-between gap-3 py-3 rounded-xl px-2.5 transition-colors ${
                      isMe ? 'bg-teal-50/70 border border-teal-200 my-1' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-mono text-xs font-extrabold tabular-nums h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 flex items-center gap-1.5">
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
                            <span className="rounded bg-teal-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500 flex items-center gap-1.5">
                          {entry.department ? (
                            <>
                              <span>{entry.department}</span>
                              <span>·</span>
                            </>
                          ) : null}
                          <span className="font-medium text-slate-600">
                            {entry.need === 'pup' ? 'Pup 💩' : 'Cepat ⚡'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.status === 'called' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                          <Sparkles className="h-3 w-3" />
                          <span>Dipanggil</span>
                        </span>
                      ) : (
                        <div>
                          <p className="font-mono text-xs font-bold tabular-nums text-slate-800">
                            {formatDuration(waitMs)}
                          </p>
                          <p className="text-[11px] tabular-nums text-slate-400">
                            Est. ~{estMinutes} mnt
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
