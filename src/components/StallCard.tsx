import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  LogOut,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import {
  OVERTIME_THRESHOLD_MS,
  formatDuration,
  getPublicDisplayName,
} from '../shared/queueLogic.ts';
import type { NeedType, Stall } from '../shared/types.ts';

interface StallCardProps {
  toilet: Stall;
  currentUserId: string;
  isAdmin: boolean;
  selectedNeed: NeedType;
  onSelectNeed: (need: NeedType) => void;
  now: number;
  busy: boolean;
  userAlreadyQueued: boolean;
  onOccupy: (need: NeedType) => void;
  onRelease: (force?: boolean) => void;
  onJoinQueue: (need: NeedType) => void;
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

  const elapsedMs =
    isOccupied && toilet.occupant ? Math.max(0, now - toilet.occupant.startedAt) : 0;
  const isOvertime = isOccupied && elapsedMs >= OVERTIME_THRESHOLD_MS;
  const reserveRemainingMs =
    isReserved && toilet.reservedFor ? Math.max(0, toilet.reservedFor.expiresAt - now) : 0;

  let statusLabel = 'Tersedia';
  let statusColorClass = 'text-emerald-700';
  let StatusIcon = CheckCircle2;

  if (isMaintenance) {
    statusLabel = 'Perawatan';
    statusColorClass = 'text-slate-500';
    StatusIcon = Wrench;
  } else if (isOccupied) {
    statusLabel = isOvertime ? 'Terisi Lama' : 'Terisi';
    statusColorClass = isOvertime ? 'text-red-600' : 'text-amber-700';
    StatusIcon = isOvertime ? AlertTriangle : Clock;
  } else if (isReserved) {
    statusLabel = isReservedForMe ? 'Giliran Kamu' : 'Dipanggil';
    statusColorClass = 'text-teal-700';
    StatusIcon = BellRing;
  }

  return (
    <section
      data-testid="single-toilet-card"
      aria-labelledby="toilet-card-heading"
      className={`rounded-xl border bg-white p-6 transition-colors ${
        isReservedForMe || isOccupiedByMe
          ? 'border-teal-600 ring-1 ring-teal-600/20'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Status Real-Time Toilet Kantor</p>
          <h2
            id="toilet-card-heading"
            className="mt-1 font-display text-xl font-bold text-slate-900"
          >
            {toilet.name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {toilet.location} <span aria-hidden="true">·</span> 1 Toilet Bersama
          </p>
        </div>

        <div className={`flex items-center gap-1.5 text-sm font-semibold ${statusColorClass}`}>
          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Live Timer & Current Occupant */}
      <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {isOccupied && toilet.occupant ? (
          <>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Sedang digunakan oleh</p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">
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
                    {toilet.occupant.department} <span aria-hidden="true">·</span>{' '}
                  </>
                ) : null}
                {toilet.occupant.need === 'pup' ? 'Keperluan Pup' : 'Keperluan Cepat (BAK)'}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p
                className={`font-mono text-3xl font-bold tabular-nums tracking-tight ${
                  isOvertime ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {formatDuration(elapsedMs)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">durasi berjalan</p>
            </div>
          </>
        ) : isReserved && toilet.reservedFor ? (
          <>
            <div className="min-w-0">
              <p className="text-xs font-medium text-teal-700">Dipanggil dari antrean #1</p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">
                {isReservedForMe
                  ? `${toilet.reservedFor.displayName} (Kamu)`
                  : getPublicDisplayName(
                      toilet.reservedFor.displayName,
                      toilet.reservedFor.isAnonymous,
                      toilet.reservedFor.userId
                    )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {toilet.reservedFor.department ? (
                  <>
                    {toilet.reservedFor.department} <span aria-hidden="true">·</span>{' '}
                  </>
                ) : null}
                {toilet.reservedFor.need === 'pup' ? 'Pup' : 'Cepat'}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-teal-700">
                {formatDuration(reserveRemainingMs)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">batas waktu masuk</p>
            </div>
          </>
        ) : isMaintenance ? (
          <div className="py-2">
            <p className="text-sm font-medium text-slate-600">
              Toilet sedang dinonaktifkan sementara untuk pembersihan atau perbaikan.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-base font-semibold text-slate-900">Toilet sedang kosong</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Pilih keperluan lalu klik masuk untuk memulai timer pribadimu.
              </p>
            </div>
            <p className="font-mono text-3xl font-bold tabular-nums text-emerald-700">
              00:00
            </p>
          </>
        )}
      </div>

      {/* Need Selector + Primary Action */}
      <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
        {!isOccupiedByMe && !isMaintenance && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">Keperluan kamu:</span>
            <div
              role="group"
              aria-label="Pilih keperluan toilet"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => onSelectNeed('pup')}
                className={`min-h-[34px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedNeed === 'pup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pup (Santai)
              </button>
              <button
                type="button"
                onClick={() => onSelectNeed('cepat')}
                className={`min-h-[34px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedNeed === 'cepat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cepat (BAK)
              </button>
            </div>
          </div>
        )}

        {isMaintenance ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            Sedang Dalam Perawatan
          </button>
        ) : isOccupiedByMe ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRelease(false)}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Selesai & Keluar Toilet</span>
          </button>
        ) : isOccupied ? (
          <div className="space-y-2.5">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="w-full min-h-[44px] rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                Masuk Antrean ({selectedNeed === 'pup' ? 'Pup' : 'Cepat'})
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
              >
                Kamu Sudah Terdaftar di Antrean
              </button>
            )}

            {isAdmin ? (
              !confirmForce ? (
                <button
                  type="button"
                  onClick={() => setConfirmForce(true)}
                  className="w-full py-1 text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Paksa Kosongkan (Admin)
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
                    className="flex-1 min-h-[38px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Konfirmasi Kosongkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForce(false)}
                    className="min-h-[38px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(toilet.reservedFor?.need ?? selectedNeed)}
            className="w-full min-h-[44px] rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
          >
            Masuk Toilet Sekarang
          </button>
        ) : isReserved ? (
          <div className="space-y-2">
            {!userAlreadyQueued ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onJoinQueue(selectedNeed)}
                className="w-full min-h-[44px] rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                Masuk Antrean Berikutnya
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
              >
                Dipesan untuk Antrean #1
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOccupy(selectedNeed)}
            className="w-full min-h-[44px] rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
          >
            Masuk Toilet Sekarang ({selectedNeed === 'pup' ? 'Pup' : 'Cepat'})
          </button>
        )}
      </div>
    </section>
  );
}
