import {
  DoorClosed,
  DoorOpen,
  Flame,
  LogOut,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import {
  DAILY_SESSION_LIMIT,
  OVERTIME_THRESHOLD_MS,
  formatDuration,
  getPublicDisplayName,
} from '../shared/queueLogic.ts';
import type { DailyQuotaInfo, NeedType, Stall } from '../shared/types.ts';
import { PoopMascot, type PoopMascotMood } from './PoopAnimations.tsx';

interface StallCardProps {
  toilet: Stall;
  currentUserId: string;
  isAdmin: boolean;
  selectedNeed: NeedType;
  onSelectNeed: (need: NeedType) => void;
  now: number;
  busy: boolean;
  userAlreadyQueued: boolean;
  dailyQuota?: DailyQuotaInfo;
  onOccupy: (need: NeedType) => void;
  onRelease: (force?: boolean) => void;
  onJoinQueue: (need: NeedType) => void;
}

function getNgedenLevel(elapsedMs: number): {
  label: string;
  badge: string;
  color: string;
  icon: typeof Flame;
} {
  const min = elapsedMs / 60_000;
  if (min < 3) {
    return {
      label: 'LV 1: SANTAI & PEMANASAN ☕',
      badge: 'SANTUY',
      color: 'bg-black border-2 border-white text-white',
      icon: Sparkles,
    };
  }
  if (min < 7) {
    return {
      label: 'LV 2: MODE FOKUS BERJUANG 🧘',
      badge: 'FOKUS',
      color: 'bg-[#1e1e24] border-2 border-amber-400 text-amber-300',
      icon: Flame,
    };
  }
  if (min < 12) {
    return {
      label: 'LV 3: PERTARUNGAN SENGIT 🌋',
      badge: 'GENTING',
      color: 'bg-[#220608] border-2 border-[#e60012] text-[#ff4d4d]',
      icon: Flame,
    };
  }
  return {
    label: 'LV 4: LEGENDA BERTAPA DI BILIK 🧘‍♂️💨',
    badge: 'MOKSA',
    color: 'bg-[#e60012] border-2 border-white text-white font-black animate-pulse',
    icon: Flame,
  };
}

export function StallCard({
  toilet,
  currentUserId,
  isAdmin,
  selectedNeed,
  onSelectNeed,
  now,
  busy,
  userAlreadyQueued,
  dailyQuota,
  onOccupy,
  onRelease,
  onJoinQueue,
}: StallCardProps) {
  const [confirmForce, setConfirmForce] = useState(false);

  const isOccupied = toilet.status === 'occupied' && toilet.occupant !== null;
  const isMaintenance = toilet.status === 'maintenance';
  const isReserved =
    toilet.status === 'available' &&
    toilet.reservedFor !== null &&
    toilet.reservedFor.expiresAt > now;

  const isOccupiedByMe = isOccupied && toilet.occupant?.userId === currentUserId;
  const isReservedForMe = isReserved && toilet.reservedFor?.userId === currentUserId;

  const quota = dailyQuota ?? {
    used: 0,
    limit: DAILY_SESSION_LIMIT,
    remaining: DAILY_SESSION_LIMIT,
  };
  const quotaExhausted = quota.remaining <= 0 && !isOccupiedByMe;

  const elapsedMs =
    isOccupied && toilet.occupant ? Math.max(0, now - toilet.occupant.startedAt) : 0;
  const isOvertime = isOccupied && elapsedMs >= OVERTIME_THRESHOLD_MS;
  const reserveRemainingMs =
    isReserved && toilet.reservedFor ? Math.max(0, toilet.reservedFor.expiresAt - now) : 0;

  let mascotMood: PoopMascotMood = 'ready';
  if (isMaintenance) {
    mascotMood = 'maintenance';
  } else if (isReservedForMe) {
    mascotMood = 'called';
  } else if (isOccupied && toilet.occupant) {
    mascotMood = toilet.occupant.need === 'pup' ? 'ngeden' : 'cepat';
  } else if (quotaExhausted) {
    mascotMood = 'exhausted';
  }

  const ngedenLevel = getNgedenLevel(elapsedMs);

  return (
    <section
      data-testid="single-toilet-card"
      aria-labelledby="toilet-card-heading"
      className="p5-card relative overflow-hidden p-5 sm:p-7"
    >
      {/* Background Halftone accent */}
      <div className="p5-halftone-pattern absolute -right-12 -top-12 h-44 w-44 opacity-15 pointer-events-none" />

      {/* Header with Comic Slanted Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p5-badge inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-black uppercase text-white bg-black border border-white">
              <span className="inline-flex items-center gap-1.5 transform skew-x-[6deg]">
                {isOccupied ? (
                  <DoorClosed className="h-3.5 w-3.5 text-[#e60012]" />
                ) : (
                  <DoorOpen className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>BILIK UTAMA</span>
              </span>
            </span>
            <span className="text-xs font-bold text-slate-500">·</span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">{toilet.location}</span>
          </div>

          <h2
            id="toilet-card-heading"
            className="mt-2 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white"
          >
            {toilet.name}
          </h2>
        </div>

        {/* Persona 5 Status Plaque */}
        <div
          className={`p5-badge inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider ${
            isMaintenance
              ? 'bg-[#1e1e24] text-slate-300 border-2 border-slate-500'
              : isOccupied
                ? isOvertime
                  ? 'bg-[#e60012] text-white border-2 border-white shadow-[3px_3px_0px_#000000] animate-pulse'
                  : 'bg-[#e60012] text-white border-2 border-white shadow-[3px_3px_0px_#000000]'
                : isReserved
                  ? 'bg-black text-teal-300 border-2 border-teal-400 shadow-[3px_3px_0px_#e60012]'
                  : 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#e60012]'
          }`}
        >
          <span className="inline-flex items-center gap-2 transform skew-x-[6deg]">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isMaintenance
                    ? 'bg-slate-400'
                    : isOccupied
                      ? 'bg-white animate-ping'
                      : isReserved
                        ? 'bg-teal-400 animate-ping'
                        : 'bg-[#e60012] animate-ping'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isMaintenance
                    ? 'bg-slate-400'
                    : isOccupied
                      ? 'bg-white'
                      : isReserved
                        ? 'bg-teal-400'
                        : 'bg-[#e60012]'
                }`}
              />
            </span>
            <span>
              {isMaintenance
                ? 'MAINTENANCE'
                : isOccupied
                  ? isOvertime
                    ? 'NGEDEN LAMA 💨'
                    : 'SEDANG DIGUNAKAN 🚫'
                  : isReserved
                    ? isReservedForMe
                      ? 'GILIRAN KAMU! ✨'
                      : 'DIPANGGIL #1'
                    : 'SIAP MASUK 🚽'}
            </span>
          </span>
        </div>
      </div>

      {/* Main Occupant / Timer Box in Persona Comic Box */}
      <div className="mt-5 border-2 border-black bg-black p-4 sm:p-5 shadow-[4px_4px_0px_#000000] relative z-10">
        {isOccupied && toilet.occupant ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <PoopMascot mood={mascotMood} size={58} interactive={true} />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#e60012]">
                    TARGET / PENGHUNI BILIK
                  </p>
                  <p className="mt-0.5 truncate text-lg sm:text-xl font-black text-white uppercase">
                    {isOccupiedByMe
                      ? `${toilet.occupant.displayName} (KAMU)`
                      : getPublicDisplayName(
                          toilet.occupant.displayName,
                          toilet.occupant.isAnonymous,
                          toilet.occupant.userId
                        )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300 font-bold">
                    {toilet.occupant.department ? (
                      <>
                        <span className="text-white">
                          {toilet.occupant.department}
                        </span>{' '}
                        ·{' '}
                      </>
                    ) : null}
                    <span className="text-[#e60012]">
                      {toilet.occupant.need === 'pup' ? 'MISI PUP 💩' : 'MISI CEPAT (BAK) ⚡'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Running Duration Timer */}
              <div className="border-2 border-white bg-[#151518] px-4 py-2.5 text-left sm:text-right shrink-0 shadow-[3px_3px_0px_#e60012]">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  DURASI BERJALAN
                </span>
                <p
                  className={`font-mono text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${
                    isOvertime ? 'text-[#ff4d4d] animate-pulse' : 'text-white'
                  }`}
                >
                  {formatDuration(elapsedMs)}
                </p>
              </div>
            </div>

            {/* Persona Ngeden Tension Meter */}
            <div
              className={`flex items-center justify-between p-2.5 text-xs font-black uppercase shadow-[2px_2px_0px_#000000] ${ngedenLevel.color}`}
            >
              <div className="flex items-center gap-2">
                <ngedenLevel.icon className="h-4 w-4 shrink-0" />
                <span>{ngedenLevel.label}</span>
              </div>
              <span className="text-[11px] uppercase tracking-wider font-black px-2 py-0.5 bg-black text-white border border-white">
                {ngedenLevel.badge}
              </span>
            </div>
          </div>
        ) : isReserved && toilet.reservedFor ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-teal-400">
                  DIPANGGIL DARI ANTREAN #1
                </p>
                <p className="mt-0.5 truncate text-lg sm:text-xl font-black text-white uppercase">
                  {isReservedForMe
                    ? `${toilet.reservedFor.displayName} (KAMU)`
                    : getPublicDisplayName(
                        toilet.reservedFor.displayName,
                        toilet.reservedFor.isAnonymous,
                        toilet.reservedFor.userId
                      )}
                </p>
                <p className="mt-0.5 text-xs text-teal-300 font-bold">
                  Batas waktu reservasi sedang berjalan!
                </p>
              </div>
            </div>

            <div className="border-2 border-teal-400 bg-[#151518] px-4 py-2.5 text-left sm:text-right shrink-0 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">
                BATAS WAKTU MASUK
              </span>
              <p className="font-mono text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-teal-300">
                {formatDuration(reserveRemainingMs)}
              </p>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="flex items-center gap-3.5 py-2">
            <PoopMascot mood={mascotMood} size={54} interactive={true} />
            <div>
              <p className="font-display text-base font-black uppercase text-white">
                TOILET SEDANG DISTERILKAN
              </p>
              <p className="mt-0.5 text-xs text-slate-400 font-bold">
                Bilik sedang dibersihkan oleh tim operasional kantor.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="font-display text-lg sm:text-xl font-black uppercase text-white">
                  TOILET BERSIH & SIAP MASUK!
                </p>
                <p className="mt-0.5 text-xs text-slate-300 font-bold">
                  {quotaExhausted
                    ? 'Kuota ngising harian kamu (10/10) sudah habis hari ini.'
                    : 'Pilih misi di bawah, lalu serbu bilik untuk menyalakan timer!'}
                </p>
              </div>
            </div>

            <div className="border-2 border-white bg-[#e60012] px-4 py-2 text-left sm:text-right shrink-0 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] font-black uppercase tracking-wider text-white block">
                STATUS
              </span>
              <p className="font-mono text-2xl font-black tabular-nums text-white">
                READY 🚽
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Need Selector & Persona Battle Commands */}
      <div className="mt-5 border-t-2 border-black pt-4 space-y-3.5 relative z-10">
        {!isOccupiedByMe && !isMaintenance && !quotaExhausted && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-white">PILIH MISI:</span>
            
            {/* Persona 5 Styled Need Switcher */}
            <div
              role="group"
              aria-label="Pilih keperluan toilet"
              className="inline-flex items-center gap-2 bg-black border-2 border-white p-1.5 shadow-[3px_3px_0px_#000000]"
            >
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('pup');
                }}
                className={`p5-badge min-h-[42px] px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer select-none active:scale-95 ${
                  selectedNeed === 'pup'
                    ? 'bg-[#e60012] text-white border-2 border-white shadow-[2px_2px_0px_#000000]'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2 transform skew-x-[6deg]">
                  <span className="text-base">💩</span>
                  <span>PUP (SANTAI)</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('cepat');
                }}
                className={`p5-badge min-h-[42px] px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer select-none active:scale-95 ${
                  selectedNeed === 'cepat'
                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#e60012]'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2 transform skew-x-[6deg]">
                  <span className="text-base">⚡</span>
                  <span>CEPAT (BAK)</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {isMaintenance ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] border-2 border-slate-600 bg-black px-4 py-2.5 text-sm font-black text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 uppercase"
          >
            <Wrench className="h-4 w-4" />
            <span>SEDANG DALAM PERAWATAN</span>
          </button>
        ) : isOccupiedByMe ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRelease(false)}
            className="p5-btn-black w-full min-h-[50px] px-4 py-2.5 text-sm font-black text-[#e60012] cursor-pointer flex items-center justify-center gap-2 uppercase"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>MISSION COMPLETE · KELUAR TOILET 🌊</span>
          </button>
        ) : quotaExhausted ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] border-2 border-[#e60012] bg-black px-4 py-2.5 text-sm font-black text-[#ff4d4d] cursor-not-allowed uppercase"
          >
            KUOTA HARIAN 10/10 HABIS · LANJUT BESOK YA!
          </button>
        ) : isOccupied ? (
          <div className="space-y-2.5">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="p5-btn-red w-full min-h-[50px] px-4 py-2.5 text-sm font-black cursor-pointer flex items-center justify-center gap-2 uppercase"
              >
                <span>MASUK ANTREAN ({selectedNeed === 'pup' ? 'PUP 💩' : 'CEPAT ⚡'})</span>
              </button>
            ) : (
              <div className="w-full min-h-[48px] border-2 border-white bg-black px-4 py-2.5 text-sm font-black text-white flex items-center justify-center text-center uppercase shadow-[3px_3px_0px_#000000]">
                KAMU SUDAH MASUK ANTREAN ⏳
              </div>
            )}

            {isAdmin ? (
              !confirmForce ? (
                <button
                  type="button"
                  onClick={() => setConfirmForce(true)}
                  className="w-full py-1 text-center text-xs font-black uppercase text-slate-400 hover:text-[#e60012] transition-colors cursor-pointer"
                >
                  [ADMIN: PAKSA KOSONGKAN BILIK]
                </button>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setConfirmForce(false);
                      onRelease(true);
                    }}
                    className="p5-btn-red flex-1 min-h-[42px] px-3 py-1.5 text-xs font-black cursor-pointer uppercase"
                  >
                    KONFIRMASI KOSONGKAN
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForce(false)}
                    className="p5-btn-black min-h-[42px] px-3 py-1.5 text-xs font-black text-white cursor-pointer uppercase"
                  >
                    BATAL
                  </button>
                </div>
              )
            ) : isOvertime ? (
              <p className="py-1 text-center text-xs text-slate-400 font-bold">
                Melebihi 15 menit — Admin dapat mengosongkan bila penghuni lupa keluar.
              </p>
            ) : null}
          </div>
        ) : isReservedForMe ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(toilet.reservedFor?.need ?? selectedNeed)}
            className="p5-btn-white w-full min-h-[50px] px-4 py-2.5 text-sm font-black cursor-pointer flex items-center justify-center gap-2 uppercase"
          >
            <span>ALL-OUT ATTACK · MASUK SEKARANG! 🎯</span>
          </button>
        ) : isReserved ? (
          <div className="space-y-2">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="p5-btn-red w-full min-h-[50px] px-4 py-2.5 text-sm font-black cursor-pointer uppercase"
              >
                MASUK ANTREAN BERIKUTNYA
              </button>
            ) : (
              <div className="w-full min-h-[48px] border-2 border-white bg-black px-4 py-2.5 text-sm font-black text-white flex items-center justify-center text-center uppercase shadow-[3px_3px_0px_#000000]">
                DIPESAN UNTUK ANTREAN #1
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(selectedNeed)}
            className="p5-btn-red w-full min-h-[50px] px-4 py-2.5 text-sm font-black cursor-pointer flex items-center justify-center gap-2 uppercase"
          >
            <span>ALL-OUT IN · MASUK TOILET ({selectedNeed === 'pup' ? 'PUP 💩' : 'CEPAT ⚡'})</span>
          </button>
        )}
      </div>
    </section>
  );
}
