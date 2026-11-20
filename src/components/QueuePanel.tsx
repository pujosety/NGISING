import { BellRing, Clock, UserPlus, XCircle } from 'lucide-react';
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
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="queue-panel-heading"
            className="font-display text-base font-bold text-slate-900"
          >
            Antrean Real-Time
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {queue.length === 0
              ? 'Belum ada yang mengantre'
              : `${queue.length} orang sedang menunggu`}
          </p>
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-slate-700">
          {queue.length} antre
        </span>
      </div>

      {/* Turn Called Banner for Current User */}
      {myQueueEntry && myQueueEntry.status === 'called' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 rounded-lg border border-teal-600 bg-teal-50 p-4"
        >
          <p className="flex items-center gap-1.5 text-sm font-bold text-teal-900">
            <BellRing className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>Giliran Kamu! {toilet.name} Sudah Kosong</span>
          </p>
          <p className="mt-1 text-xs text-teal-800">
            Segera masuk sebelum batas waktu habis:{' '}
            <span className="font-mono font-bold tabular-nums">
              {formatDuration(Math.max(0, (myQueueEntry.expiresAt ?? now) - now))}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              onClick={() => onClaimToilet(myQueueEntry.need)}
              className="min-h-[40px] flex-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              Masuk Sekarang
            </motion.button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeaveQueue}
              className="min-h-[40px] rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100/50 transition-colors whitespace-nowrap"
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
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoinQueue(selectedNeed)}
            className="inline-flex w-full min-h-[42px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {quotaExhausted
                ? 'Kuota Harian 10/10 Habis'
                : `Ambil Antrean (${selectedNeed === 'pup' ? 'Pup' : 'Cepat'})`}
            </span>
          </motion.button>
        </div>
      )}

      {/* Waiting Status for Current User */}
      {myQueueEntry && myQueueEntry.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Posisi Kamu #{queue.findIndex((q) => q.id === myQueueEntry.id) + 1}
            </p>
            <p className="text-xs text-slate-500">
              Keperluan: {myQueueEntry.need === 'pup' ? 'Pup (Santai)' : 'Cepat (BAK)'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLeaveQueue}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <XCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Batalkan</span>
          </button>
        </motion.div>
      )}

      {/* Ordered Queue List */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        {queue.length === 0 ? (
          <div className="py-6 text-center">
            <Clock className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              Antrean kosong saat ini
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Jika toilet sedang terisi, kamu bisa ambil nomor antrean agar otomatis dipanggil saat kosong.
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

                return (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono text-xs font-bold tabular-nums w-6 text-center shrink-0 ${
                        entry.status === 'called' ? 'text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {isMe
                          ? `${entry.displayName} (Kamu)`
                          : getPublicDisplayName(entry.displayName, entry.isAnonymous, entry.userId)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {entry.department ? (
                          <>
                            {entry.department} <span aria-hidden="true">·</span>{' '}
                          </>
                        ) : null}
                        {entry.need === 'pup' ? 'Pup' : 'Cepat'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {entry.status === 'called' ? (
                      <p className="text-xs font-semibold text-teal-700">Dipanggil</p>
                    ) : (
                      <p className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                        {formatDuration(waitMs)}
                      </p>
                    )}
                    <p className="text-[11px] tabular-nums text-slate-500">
                      {entry.status === 'called' ? 'Siap masuk' : `Est. ~${estMinutes} mnt`}
                    </p>
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
