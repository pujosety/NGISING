import {
  DoorClosed,
  DoorOpen,
  Flame,
  LogOut,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
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
      label: 'Level 1: Santai & Pemanasan ☕',
      badge: 'Santuy',
      color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30',
      icon: Sparkles,
    };
  }
  if (min < 7) {
    return {
      label: 'Level 2: Mode Fokus Berjuang 🧘',
      badge: 'Fokus',
      color: 'text-amber-300 bg-amber-950/40 border-amber-500/30',
      icon: Flame,
    };
  }
  if (min < 12) {
    return {
      label: 'Level 3: Pertarungan Sengit 🌋',
      badge: 'Genting',
      color: 'text-orange-300 bg-orange-950/50 border-orange-500/40',
      icon: Flame,
    };
  }
  return {
    label: 'Level 4: Legenda Bertapa di Bilik 🧘‍♂️💨',
    badge: 'Moksa',
    color: 'text-rose-300 bg-rose-950/60 border-rose-500/50 animate-pulse',
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
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 transition-all duration-300 glass-card ${
        isReservedForMe
          ? 'border-teal-500/60 ring-2 ring-teal-500/30'
          : isOccupiedByMe
            ? 'border-[#c99f57]/80 ring-2 ring-[#ad7c2b]/40'
            : isOccupied
              ? 'border-[#c99f57]/30'
              : 'border-[#c99f57]/20 hover:border-[#c99f57]/50'
      }`}
    >
      {/* Visual Door Header with Status Lamp */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold text-[#dbc08b]">
              {isOccupied ? (
                <DoorClosed className="h-3 w-3 text-rose-400" />
              ) : (
                <DoorOpen className="h-3 w-3 text-emerald-400" />
              )}
              <span>Bilik Utama</span>
            </span>
            <span className="text-xs text-[#c99f57]/40">·</span>
            <span className="text-xs text-[#dbc08b]/80">{toilet.location}</span>
          </div>

          <h2
            id="toilet-card-heading"
            className="mt-1.5 font-display text-2xl font-black tracking-tight text-white"
          >
            {toilet.name}
          </h2>
        </div>

        {/* 3D Glass Status Plaque */}
        <div
          className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-bold shadow-md ${
            isMaintenance
              ? 'border-slate-600 bg-slate-900/80 text-slate-300'
              : isOccupied
                ? isOvertime
                  ? 'border-rose-500/60 bg-rose-950/70 text-rose-200 ring-1 ring-rose-500/40'
                  : 'border-rose-500/40 bg-rose-950/50 text-rose-200'
                : isReserved
                  ? 'border-teal-400/60 bg-teal-950/60 text-teal-200 animate-pulse'
                  : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isMaintenance
                  ? 'bg-slate-400'
                  : isOccupied
                    ? 'bg-rose-400 animate-ping'
                    : isReserved
                      ? 'bg-teal-400 animate-ping'
                      : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isMaintenance
                  ? 'bg-slate-400'
                  : isOccupied
                    ? 'bg-rose-500'
                    : isReserved
                      ? 'bg-teal-400'
                      : 'bg-emerald-400'
              }`}
            />
          </span>
          <span>
            {isMaintenance
              ? 'Sedang Dibersihkan'
              : isOccupied
                ? isOvertime
                  ? 'Sedang Ngeden Lama 💨'
                  : 'Sedang Digunakan 🚫'
                : isReserved
                  ? isReservedForMe
                    ? 'Giliran Kamu! Masuk! ✨'
                    : 'Dipanggil #1'
                  : 'Kosong · Siap Masuk 🚽'}
          </span>
        </div>
      </div>

      {/* Main Occupant / Timer Box in Glass */}
      <div className="mt-5 rounded-2xl border border-[#c99f57]/20 bg-[#241407]/60 p-4 sm:p-5 backdrop-blur-md">
        {isOccupied && toilet.occupant ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <PoopMascot mood={mascotMood} size={58} interactive={true} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#dbc08b]">
                    Penghuni Bilik Saat Ini
                  </p>
                  <p className="mt-0.5 truncate text-lg sm:text-xl font-black text-white">
                    {isOccupiedByMe
                      ? `${toilet.occupant.displayName} (Kamu)`
                      : getPublicDisplayName(
                          toilet.occupant.displayName,
                          toilet.occupant.isAnonymous,
                          toilet.occupant.userId
                        )}
                  </p>
                  <p className="mt-0.5 text-xs text-[#dbc08b]/80">
                    {toilet.occupant.department ? (
                      <>
                        <span className="font-semibold text-white">
                          {toilet.occupant.department}
                        </span>{' '}
                        ·{' '}
                      </>
                    ) : null}
                    <span className="font-bold text-[#e8d9b5]">
                      {toilet.occupant.need === 'pup' ? 'Misi Pup 💩' : 'Misi Cepat (BAK) ⚡'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Running Duration Timer in Glass 3D */}
              <div className="glass-card rounded-2xl border border-[#c99f57]/30 px-4 py-2.5 text-left sm:text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dbc08b]/70 block">
                  Durasi Berjalan
                </span>
                <p
                  className={`font-mono text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${
                    isOvertime ? 'text-rose-400 animate-pulse' : 'text-white'
                  }`}
                >
                  {formatDuration(elapsedMs)}
                </p>
              </div>
            </div>

            {/* Fun Ngeden Level Meter */}
            <div
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${ngedenLevel.color}`}
            >
              <div className="flex items-center gap-2">
                <ngedenLevel.icon className="h-4 w-4 shrink-0" />
                <span>{ngedenLevel.label}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-black opacity-90">
                {ngedenLevel.badge}
              </span>
            </div>
          </div>
        ) : isReserved && toilet.reservedFor ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  Dipanggil dari antrean #1
                </p>
                <p className="mt-0.5 truncate text-lg sm:text-xl font-black text-white">
                  {isReservedForMe
                    ? `${toilet.reservedFor.displayName} (Kamu)`
                    : getPublicDisplayName(
                        toilet.reservedFor.displayName,
                        toilet.reservedFor.isAnonymous,
                        toilet.reservedFor.userId
                      )}
                </p>
                <p className="mt-0.5 text-xs text-teal-200/80">
                  Batas waktu reservasi sedang berjalan
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-teal-500/40 px-4 py-2.5 text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                Batas Waktu Masuk
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
              <p className="font-display text-base font-bold text-white">
                Toilet Sedang Disterilkan
              </p>
              <p className="mt-0.5 text-xs text-[#dbc08b]/70">
                Bilik sedang dibersihkan oleh tim operasional kantor.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="font-display text-lg sm:text-xl font-black text-white">
                  Toilet Bersih & Siap Digunakan!
                </p>
                <p className="mt-0.5 text-xs text-[#dbc08b]/80">
                  {quotaExhausted
                    ? 'Kuota ngising harian kamu (10/10) sudah habis hari ini.'
                    : 'Pilih keperluan di bawah, lalu klik masuk untuk menyalakan timer!'}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-emerald-500/40 px-4 py-2 text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Status
              </span>
              <p className="font-mono text-2xl font-black tabular-nums text-emerald-300">
                READY 🚽
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Need Selector + 3D Action Buttons */}
      <div className="mt-5 border-t border-[#c99f57]/15 pt-4 space-y-3.5">
        {!isOccupiedByMe && !isMaintenance && !quotaExhausted && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#e8d9b5]">Keperluanmu:</span>
            <div
              role="group"
              aria-label="Pilih keperluan toilet"
              className="relative inline-flex items-center rounded-2xl bg-[#241407]/80 p-1.5 border border-[#c99f57]/20 shadow-inner"
            >
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('pup');
                }}
                className={`relative z-10 min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer select-none active:scale-95 ${
                  selectedNeed === 'pup' ? 'text-white font-extrabold' : 'text-[#dbc08b]/70 hover:text-white'
                }`}
              >
                {selectedNeed === 'pup' && (
                  <motion.div
                    layoutId="need-slider-pill-glass"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] shadow-md border border-[#c99f57]/60"
                  />
                )}
                <span className="relative z-10 text-base">💩</span>
                <span className="relative z-10">Pup (Santai)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('cepat');
                }}
                className={`relative z-10 min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer select-none active:scale-95 ${
                  selectedNeed === 'cepat' ? 'text-white font-extrabold' : 'text-[#dbc08b]/70 hover:text-white'
                }`}
              >
                {selectedNeed === 'cepat' && (
                  <motion.div
                    layoutId="need-slider-pill-glass"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0d9488] to-[#14b8a6] shadow-md border border-teal-400/60"
                  />
                )}
                <span className="relative z-10 text-base">⚡</span>
                <span className="relative z-10">Cepat (BAK)</span>
              </button>
            </div>
          </div>
        )}

        {isMaintenance ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-bold text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            <span>Sedang Dalam Perawatan</span>
          </button>
        ) : isOccupiedByMe ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRelease(false)}
            className="btn-3d-poop w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black text-white cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Plung! Selesai & Keluar Toilet (Lega!) 🌊</span>
          </button>
        ) : quotaExhausted ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-2.5 text-sm font-bold text-rose-300 cursor-not-allowed"
          >
            Kuota Harian 10/10 Habis — Lanjut Besok Ya Bro!
          </button>
        ) : isOccupied ? (
          <div className="space-y-2.5">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="btn-3d-poop w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black text-white cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Masuk Antrean ({selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})</span>
              </button>
            ) : (
              <div className="glass-pill w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-bold text-[#dbc08b] flex items-center justify-center text-center">
                Kamu Sudah Masuk di Antrean ⏳
              </div>
            )}

            {isAdmin ? (
              !confirmForce ? (
                <button
                  type="button"
                  onClick={() => setConfirmForce(true)}
                  className="w-full py-1 text-center text-xs font-bold text-[#dbc08b]/70 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Paksa Kosongkan Bilik (Admin)
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
                    className="btn-3d-red flex-1 min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    Konfirmasi Kosongkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForce(false)}
                    className="glass-pill min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-bold text-[#e8d9b5] hover:text-white cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )
            ) : isOvertime ? (
              <p className="py-1 text-center text-xs text-[#dbc08b]/70">
                Melebihi 15 menit — Admin dapat mengosongkan bila penghuni lupa keluar.
              </p>
            ) : null}
          </div>
        ) : isReservedForMe ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(toilet.reservedFor?.need ?? selectedNeed)}
            className="btn-3d-teal w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black text-white cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Masuk Toilet Sekarang! (Giliranmu) 🎯</span>
          </button>
        ) : isReserved ? (
          <div className="space-y-2">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="btn-3d-poop w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black text-white cursor-pointer"
              >
                Masuk Antrean Berikutnya
              </button>
            ) : (
              <div className="glass-pill w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-bold text-[#dbc08b] flex items-center justify-center text-center">
                Dipesan untuk Antrean #1
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(selectedNeed)}
            className="btn-3d-poop w-full min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black text-white cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Masuk Toilet Sekarang ({selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})</span>
          </button>
        )}
      </div>
    </section>
  );
}
