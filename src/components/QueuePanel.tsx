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
      className="p5-card flex flex-col p-5 sm:p-7 relative overflow-hidden"
    >
      {/* Halftone BG accent */}
      <div className="p5-halftone-pattern absolute -left-12 -bottom-12 h-44 w-44 opacity-15 pointer-events-none" />

      <div className="flex items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="queue-panel-heading"
              className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white"
            >
              ANTREAN BILIK
            </h2>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e60012] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e60012]" />
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-300">
            {queue.length === 0
              ? 'Bilik sepi, tidak ada yang mengantre'
              : `${queue.length} pejuang toilet sedang bersiap`}
          </p>
        </div>

        <span className="p5-badge inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-black uppercase text-black bg-white border border-black shadow-[2px_2px_0px_#e60012]">
          <span className="inline-flex items-center gap-1.5 transform skew-x-[6deg]">
            <span className="text-sm font-black">{queue.length}</span>
            <span className="font-sans font-bold text-[10px]">ANTRE</span>
          </span>
        </span>
      </div>

      {/* Turn Called Banner: Persona 5 Battle Alert */}
      {myQueueEntry && myQueueEntry.status === 'called' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 border-2 border-white bg-[#e60012] p-4 text-white shadow-[4px_4px_0px_#000000] relative z-10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-black text-white border-2 border-white shadow-[2px_2px_0px_#000000] shrink-0">
              <BellRing className="h-5 w-5 animate-bounce text-[#e60012]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-white">
                BATTLE ALERT! GILIRAN KAMU TIBA!
              </p>
              <p className="text-xs text-white/90 font-bold">
                Masuk sebelum hangus:{' '}
                <span className="font-mono font-black tabular-nums bg-black text-white px-2 py-0.5 border border-white">
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
              className="p5-btn-white min-h-[44px] flex-1 px-4 py-2 text-sm font-black cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 uppercase"
            >
              <span>ALL-OUT ATTACK · MASUK! 🎯</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeaveQueue}
              className="p5-btn-black min-h-[44px] px-4 py-2 text-xs font-black text-white cursor-pointer whitespace-nowrap uppercase"
            >
              LEWATI
            </button>
          </div>
        </motion.div>
      )}

      {/* Join Queue Button */}
      {!myQueueEntry && !userAlreadyOccupying && toilet.status !== 'available' && (
        <div className="mt-4 border-t-2 border-black pt-4 relative z-10">
          <button
            type="button"
            disabled={busy || quotaExhausted}
            onClick={() => onJoinQueue(selectedNeed)}
            className="p5-btn-red inline-flex w-full min-h-[48px] items-center justify-center gap-2 px-4 py-2.5 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap uppercase"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {quotaExhausted
                ? 'KUOTA HARIAN 10/10 HABIS'
                : `AMBIL NOMOR ANTREAN (${selectedNeed === 'pup' ? 'PUP 💩' : 'CEPAT ⚡'})`}
            </span>
          </button>
        </div>
      )}

      {/* Waiting Status for Current User */}
      {myQueueEntry && myQueueEntry.status === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between gap-3 border-2 border-white bg-black p-3.5 shadow-[3px_3px_0px_#e60012] relative z-10"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="p5-badge font-mono text-xs font-black bg-[#e60012] text-white px-2 py-0.5 border border-white">
                <span className="transform skew-x-[6deg] inline-block">
                  #{queue.findIndex((q) => q.id === myQueueEntry.id) + 1}
                </span>
              </span>
              <p className="text-sm font-black uppercase text-white">
                KAMU SEDANG MENGANTRE
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-300 font-bold">
              MISI: {myQueueEntry.need === 'pup' ? 'PUP (SANTAI) 💩' : 'CEPAT (BAK) ⚡'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onLeaveQueue}
            className="p5-btn-black inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1 text-xs font-black text-white hover:text-[#ff4d4d] whitespace-nowrap shrink-0 cursor-pointer uppercase"
          >
            <XCircle className="h-4 w-4 text-[#e60012]" aria-hidden="true" />
            <span>BATAL</span>
          </button>
        </motion.div>
      )}

      {/* Ordered Queue List */}
      <div className="mt-4 border-t-2 border-black pt-3 relative z-10">
        {queue.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-white bg-black shadow-[3px_3px_0px_#000000]">
              <PoopMiniIcon className="h-7 w-7 text-[#e60012]" />
            </div>
            <p className="mt-3 text-sm font-black uppercase text-white">
              ANTREAN BERSIH & LENGANG
            </p>
            <p className="mt-1 text-xs text-slate-400 font-bold max-w-xs mx-auto">
              Tidak ada antrean saat ini. Siapa cepat, dia yang berhak menikmati bilik toilet!
            </p>
          </div>
        ) : (
          <ol className="space-y-2" data-testid="queue-list">
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
                    className={`flex items-center justify-between gap-3 p-3 border-2 transition-all ${
                      isMe
                        ? 'bg-black border-[#e60012] shadow-[3px_3px_0px_#000000]'
                        : 'bg-[#151518] border-black hover:border-white shadow-[2px_2px_0px_#000000]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-mono text-xs font-black tabular-nums h-7 w-7 flex items-center justify-center shrink-0 border-2 ${
                          idx === 0
                            ? 'bg-[#e60012] text-white border-white'
                            : idx === 1
                              ? 'bg-white text-black border-black'
                              : 'bg-black text-white border-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white flex items-center gap-1.5 uppercase">
                          <span>
                            {isMe
                              ? `${entry.displayName} (KAMU)`
                              : getPublicDisplayName(
                                  entry.displayName,
                                  entry.isAnonymous,
                                  entry.userId
                                )}
                          </span>
                          {isMe && (
                            <span className="bg-[#e60012] px-1.5 py-0.2 text-[9px] font-black text-white uppercase border border-white">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-300 font-bold flex items-center gap-1.5">
                          <span className={entry.need === 'pup' ? 'text-[#ff4d4d]' : 'text-amber-300'}>
                            {entry.need === 'pup' ? 'PUP 💩' : 'CEPAT ⚡'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.status === 'called' ? (
                        <span className="p5-badge inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black bg-[#e60012] text-white border border-white">
                          <span className="inline-flex items-center gap-1 transform skew-x-[6deg]">
                            <Sparkles className="h-3 w-3" />
                            <span>DIPANGGIL</span>
                          </span>
                        </span>
                      ) : (
                        <div>
                          <p className="font-mono text-xs font-black tabular-nums text-white">
                            {formatDuration(waitMs)}
                          </p>
                          <p className="text-[11px] tabular-nums text-slate-400 font-mono font-bold">
                            ~{estMinutes} MNT
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
