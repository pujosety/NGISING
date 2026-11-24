import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  Flame,
  LogOut,
  Sparkles,
  Wrench,
  Zap,
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
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: Sparkles,
    };
  }
  if (min < 7) {
    return {
      label: 'Level 2: Mode Fokus Berjuang 🧘',
      badge: 'Fokus',
      color: 'text-amber-800 bg-amber-50 border-amber-200',
      icon: Flame,
    };
  }
  if (min < 12) {
    return {
      label: 'Level 3: Pertarungan Batin Sengit ⚡',
      badge: 'Intens',
      color: 'text-orange-800 bg-orange-50 border-orange-200',
      icon: Zap,
    };
  }
  return {
    label: 'Level 4: Waspada Kaki Kesemutan Parah! 🚨',
    badge: 'Lama Sekali',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: AlertTriangle,
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

  const quotaPct = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  const ngedenLevel = getNgedenLevel(elapsedMs);

  return (
    <section
      data-testid="single-toilet-card"
      aria-labelledby="toilet-card-heading"
      className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 ${
        isReservedForMe
          ? 'border-teal-500 ring-2 ring-teal-500/20 bg-gradient-to-b from-teal-50/40 via-white to-white'
          : isOccupiedByMe
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-b from-amber-50/40 via-white to-white'
            : isOccupied
              ? 'border-slate-300'
              : 'border-slate-200 hover:border-teal-200'
      }`}
    >
      {/* Visual Door Header with Status Lamp */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {isOccupied ? (
                <DoorClosed className="h-3 w-3 text-amber-600" />
              ) : (
                <DoorOpen className="h-3 w-3 text-emerald-600" />
              )}
              <span>Bilik Utama</span>
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{toilet.location}</span>
          </div>

          <h2
            id="toilet-card-heading"
            className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900"
          >
            {toilet.name}
          </h2>
        </div>

        {/* Fun Door Status Plaque */}
        <div
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold shadow-xs ${
            isMaintenance
              ? 'border-slate-300 bg-slate-100 text-slate-700'
              : isOccupied
                ? isOvertime
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
                : isReserved
                  ? 'border-teal-400 bg-teal-50 text-teal-800 animate-pulse'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isMaintenance
                  ? 'bg-slate-400'
                  : isOccupied
                    ? 'bg-amber-400 animate-ping'
                    : isReserved
                      ? 'bg-teal-400 animate-ping'
                      : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isMaintenance
                  ? 'bg-slate-500'
                  : isOccupied
                    ? 'bg-amber-500'
                    : isReserved
                      ? 'bg-teal-600'
                      : 'bg-emerald-500'
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
                  : 'Kosong · Silakan Masuk 🚽'}
          </span>
        </div>
      </div>

      {/* Main Occupant / Timer Box */}
      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors">
        {isOccupied && toilet.occupant ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <PoopMascot mood={mascotMood} size={58} interactive={true} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Penghuni Bilik Saat Ini
                  </p>
                  <p className="mt-0.5 truncate text-lg font-extrabold text-slate-900">
                    {isOccupiedByMe
                      ? `${toilet.occupant.displayName} (Kamu)`
                      : getPublicDisplayName(
                          toilet.occupant.displayName,
                          toilet.occupant.isAnonymous,
                          toilet.occupant.userId
                        )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {toilet.occupant.department ? (
                      <>
                        <span className="font-medium text-slate-700">
                          {toilet.occupant.department}
                        </span>{' '}
                        ·{' '}
                      </>
                    ) : null}
                    <span className="font-semibold text-amber-800">
                      {toilet.occupant.need === 'pup' ? 'Misi Pup 💩' : 'Misi Cepat (BAK) ⚡'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Live Running Duration Timer */}
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-left sm:text-right shrink-0 shadow-xs">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                  Durasi Berjalan
                </span>
                <p
                  className={`font-mono text-3xl font-extrabold tabular-nums tracking-tight ${
                    isOvertime ? 'text-red-600 animate-pulse' : 'text-slate-900'
                  }`}
                >
                  {formatDuration(elapsedMs)}
                </p>
              </div>
            </div>

            {/* Fun Ngeden Level Meter */}
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs font-semibold ${ngedenLevel.color}`}
            >
              <div className="flex items-center gap-1.5">
                <ngedenLevel.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{ngedenLevel.label}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                {ngedenLevel.badge}
              </span>
            </div>
          </div>
        ) : isReserved && toilet.reservedFor ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                  Dipanggil dari antrean #1
                </p>
                <p className="mt-0.5 truncate text-lg font-extrabold text-slate-900">
                  {isReservedForMe
                    ? `${toilet.reservedFor.displayName} (Kamu)`
                    : getPublicDisplayName(
                        toilet.reservedFor.displayName,
                        toilet.reservedFor.isAnonymous,
                        toilet.reservedFor.userId
                      )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Batas waktu reservasi sedang berjalan
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-left sm:text-right shrink-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-teal-600 block">
                Batas Waktu Masuk
              </span>
              <p className="font-mono text-3xl font-extrabold tabular-nums tracking-tight text-teal-700">
                {formatDuration(reserveRemainingMs)}
              </p>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="flex items-center gap-3.5 py-2">
            <PoopMascot mood={mascotMood} size={54} interactive={true} />
            <div>
              <p className="font-display text-base font-bold text-slate-800">
                Toilet Sedang Disterilkan
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Bilik sedang dibersihkan oleh tim operasional kantor.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <PoopMascot mood={mascotMood} size={58} interactive={true} />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-slate-900">
                  Toilet Bersih & Siap Digunakan!
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {quotaExhausted
                    ? 'Kuota ngising harian kamu (10/10) sudah habis hari ini.'
                    : 'Pilih keperluan di bawah, lalu klik masuk untuk menyalakan timer!'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-left sm:text-right shrink-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 block">
                Status
              </span>
              <p className="font-mono text-2xl font-extrabold tabular-nums text-emerald-700">
                READY 🚽
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Need Selector + Primary Action */}
      <div className="mt-4 border-t border-slate-100 pt-3.5 space-y-3">
        {!isOccupiedByMe && !isMaintenance && !quotaExhausted && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-xs font-bold text-slate-700">Keperluanmu:</span>
            <div
              role="group"
              aria-label="Pilih keperluan toilet"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('pup');
                }}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
                  selectedNeed === 'pup'
                    ? 'bg-white text-slate-900 shadow-sm ring-2 ring-amber-400'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">💩</span>
                <span>Pup (Santai)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(8); } catch {}
                  }
                  onSelectNeed('cepat');
                }}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
                  selectedNeed === 'cepat'
                    ? 'bg-white text-slate-900 shadow-sm ring-2 ring-teal-500'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">⚡</span>
                <span>Cepat (BAK)</span>
              </button>
            </div>
          </div>
        )}

        {isMaintenance ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            <span>Sedang Dalam Perawatan</span>
          </button>
        ) : isOccupiedByMe ? (
          <motion.button
            type="button"
            disabled={busy}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRelease(false)}
            className="inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Plung! Selesai & Keluar Toilet (Lega!) 🌊</span>
          </motion.button>
        ) : quotaExhausted ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[46px] rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 cursor-not-allowed"
          >
            Kuota Harian 10/10 Habis — Lanjut Besok Ya Bro!
          </button>
        ) : isOccupied ? (
          <div className="space-y-2.5">
            {!userAlreadyQueued ? (
              <motion.button
                type="button"
                disabled={busy}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onJoinQueue(selectedNeed)}
                className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:from-slate-800 hover:to-slate-700 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Masuk Antrean ({selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})</span>
              </motion.button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
              >
                Kamu Sudah Masuk di Antrean ⏳
              </button>
            )}

            {isAdmin ? (
              !confirmForce ? (
                <button
                  type="button"
                  onClick={() => setConfirmForce(true)}
                  className="w-full py-1 text-center text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
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
                    className="flex-1 min-h-[38px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Konfirmasi Kosongkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForce(false)}
                    className="min-h-[38px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )
            ) : isOvertime ? (
              <p className="py-1 text-center text-xs text-slate-500">
                Melebihi 15 menit — Admin dapat mengosongkan bila penghuni lupa keluar.
              </p>
            ) : null}
          </div>
        ) : isReservedForMe ? (
          <motion.button
            type="button"
            disabled={busy}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOccupy(toilet.reservedFor?.need ?? selectedNeed)}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-teal-600/20 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Masuk Toilet Sekarang! (Giliranmu) 🎯</span>
          </motion.button>
        ) : isReserved ? (
          <div className="space-y-2">
            {!userAlreadyQueued ? (
              <motion.button
                type="button"
                disabled={busy}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onJoinQueue(selectedNeed)}
                className="w-full min-h-[46px] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-60 transition-all cursor-pointer"
              >
                Masuk Antrean Berikutnya
              </motion.button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
              >
                Dipesan untuk Antrean #1
              </button>
            )}
          </div>
        ) : (
          <motion.button
            type="button"
            disabled={busy}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOccupy(selectedNeed)}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-teal-600/20 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Masuk Toilet Sekarang ({selectedNeed === 'pup' ? 'Pup 💩' : 'Cepat ⚡'})</span>
          </motion.button>
        )}
      </div>
    </section>
  );
}
