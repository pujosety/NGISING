import {
  BellRing,
  Clock,
  DoorClosed,
  DoorOpen,
  Expand,
  Flame,
  Minimize,
  QrCode,
  Sparkles,
  Tv,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  OVERTIME_THRESHOLD_MS,
  estimateWaitMinutes,
  formatDuration,
  getPublicDisplayName,
} from '../shared/queueLogic.ts';
import type { OfficeState } from '../shared/types.ts';
import { PoopMascot } from './PoopAnimations.tsx';

interface DisplayMonitorViewProps {
  officeState: OfficeState | null;
  now: number;
  connected: boolean;
  lastSyncedAt: number;
}

export function DisplayMonitorView({
  officeState,
  now,
  connected,
  lastSyncedAt,
}: DisplayMonitorViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const toilet = officeState?.toilet ?? null;
  const queue = officeState?.queue ?? [];
  const history = officeState?.history ?? [];

  const isOccupied = toilet?.status === 'occupied' && toilet.occupant !== null;
  const isMaintenance = toilet?.status === 'maintenance';
  const isReserved =
    toilet?.status === 'available' &&
    toilet.reservedFor !== null &&
    toilet.reservedFor.expiresAt > now;

  const elapsedMs =
    isOccupied && toilet?.occupant ? Math.max(0, now - toilet.occupant.startedAt) : 0;
  const isOvertime = isOccupied && elapsedMs >= OVERTIME_THRESHOLD_MS;
  const reserveRemainingMs =
    isReserved && toilet?.reservedFor ? Math.max(0, toilet.reservedFor.expiresAt - now) : 0;

  // Format real-time wall clock
  const timeString = new Date(now).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateString = new Date(now).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative flex min-h-[85vh] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-10 text-white shadow-2xl">
      {/* Top Header Bar: Screen Title, Wall Clock & Fullscreen Control */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40">
            <Tv className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ngising TV Monitor
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/40 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE SCREEN</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {toilet?.location || 'Toilet Kantor Lantai 2'} · Layar Monitor Publik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-teal-400 tabular-nums">
              {timeString}{' '}
              <span className="text-xs font-sans font-medium text-slate-400">WIB</span>
            </p>
            <p className="text-xs text-slate-400">{dateString}</p>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (Fullscreen)'}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Expand className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Giant Status Stage */}
      <div className="my-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
        {/* Left: Giant Toilet Lamp & Current Occupancy Box */}
        <div className="lg:col-span-7">
          <div
            className={`relative overflow-hidden rounded-3xl border p-8 sm:p-12 shadow-2xl transition-all duration-500 ${
              isMaintenance
                ? 'border-slate-700 bg-slate-900/90 text-slate-300 ring-1 ring-slate-800'
                : isOccupied
                  ? isOvertime
                    ? 'border-red-500/50 bg-gradient-to-br from-red-950/60 via-slate-900 to-slate-950 ring-2 ring-red-500/30'
                    : 'border-amber-500/50 bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 ring-2 ring-amber-500/30'
                  : isReserved
                    ? 'border-teal-500/50 bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-950 ring-2 ring-teal-500/40 animate-pulse'
                    : 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 ring-2 ring-emerald-500/30'
            }`}
          >
            {/* Header Lamp & Plaque */}
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300">
                {isOccupied ? (
                  <DoorClosed className="h-4 w-4 text-amber-400" />
                ) : (
                  <DoorOpen className="h-4 w-4 text-emerald-400" />
                )}
                <span>{toilet?.name || 'Bilik Utama'}</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
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
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isMaintenance
                        ? 'bg-slate-500'
                        : isOccupied
                          ? 'bg-amber-500'
                          : isReserved
                            ? 'bg-teal-500'
                            : 'bg-emerald-500'
                    }`}
                  />
                </span>
                <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-slate-300">
                  {isMaintenance
                    ? 'MAINTENANCE'
                    : isOccupied
                      ? 'IN USE'
                      : isReserved
                        ? 'CALLED'
                        : 'VACANT'}
                </span>
              </div>
            </div>

            {/* Giant Main Display Text */}
            <div className="mt-8">
              {isMaintenance ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-slate-400">
                    <Wrench className="h-8 w-8 text-slate-400 animate-spin" />
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      Sedang Dibersihkan
                    </span>
                  </div>
                  <h3 className="font-display text-4xl sm:text-6xl font-black text-slate-200">
                    PERAWATAN
                  </h3>
                  <p className="text-base text-slate-400 max-w-md">
                    Bilik sedang dibersihkan dan disterilkan oleh tim operasional kantor.
                  </p>
                </div>
              ) : isOccupied && toilet?.occupant ? (
                <div className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Flame className="h-4 w-4 animate-bounce" />
                    <span>Toilet Sedang Terisi</span>
                  </span>
                  <h3 className="font-display text-4xl sm:text-6xl font-black text-white truncate tracking-tight">
                    {getPublicDisplayName(
                      toilet.occupant.displayName,
                      toilet.occupant.isAnonymous,
                      toilet.occupant.userId
                    )}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {toilet.occupant.department ? (
                      <span className="font-semibold text-slate-200">
                        Divisi {toilet.occupant.department} ·{' '}
                      </span>
                    ) : null}
                    <span>
                      {toilet.occupant.need === 'pup'
                        ? 'Misi Pup 💩 (Santai)'
                        : 'Misi Cepat ⚡ (BAK)'}
                    </span>
                  </p>

                  {/* Giant Running Timer */}
                  <div className="mt-6 flex flex-wrap items-baseline gap-4 rounded-2xl border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-md">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Durasi Berjalan:
                    </span>
                    <span
                      className={`font-mono text-5xl sm:text-7xl font-black tabular-nums tracking-tight ${
                        isOvertime ? 'text-red-400 animate-pulse' : 'text-amber-400'
                      }`}
                    >
                      {formatDuration(elapsedMs)}
                    </span>
                  </div>
                </div>
              ) : isReserved && toilet?.reservedFor ? (
                <div className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                    <BellRing className="h-4 w-4 animate-bounce" />
                    <span>Giliran Tiba! Bilik Siap</span>
                  </span>
                  <h3 className="font-display text-4xl sm:text-6xl font-black text-teal-300 truncate tracking-tight">
                    {getPublicDisplayName(
                      toilet.reservedFor.displayName,
                      toilet.reservedFor.isAnonymous,
                      toilet.reservedFor.userId
                    )}
                  </h3>
                  <p className="text-sm text-teal-200">
                    Silakan segera masuk sebelum batas reservasi berakhir.
                  </p>

                  <div className="mt-6 flex flex-wrap items-baseline gap-4 rounded-2xl border border-teal-500/30 bg-teal-950/50 px-6 py-4">
                    <span className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                      Batas Waktu Masuk:
                    </span>
                    <span className="font-mono text-5xl sm:text-7xl font-black tabular-nums text-teal-300">
                      {formatDuration(reserveRemainingMs)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Toilet Bersih & Siap</span>
                  </span>
                  <h3 className="font-display text-4xl sm:text-6xl font-black text-emerald-400 tracking-tight">
                    KOSONG / TERSEDIA
                  </h3>
                  <p className="text-lg text-slate-300 max-w-lg">
                    Bilik toilet sedang kosong. Silakan masuk atau buka aplikasi untuk menyalakan timer sesi!
                  </p>
                  <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-6 py-3 text-emerald-300 font-mono text-xl font-bold">
                    <span>READY TO USE 🚽</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Queue List & Scan-to-Join Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h4 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <span>Antrean Menunggu</span>
                  <span className="rounded-full bg-teal-500/20 px-2 py-0.5 font-mono text-xs font-bold text-teal-400">
                    {queue.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar rekan kantor yang menunggu giliran
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-sm font-bold text-slate-300">Tidak ada antrean</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bilik sepi, siapa saja bisa langsung masuk!
                  </p>
                </div>
              ) : (
                queue.map((entry, idx) => {
                  const waitingIndex = queue
                    .filter((q) => q.status === 'waiting')
                    .findIndex((q) => q.id === entry.id);
                  const estMin =
                    entry.status === 'called' || !toilet
                      ? 0
                      : estimateWaitMinutes(toilet, queue, history, Math.max(0, waitingIndex), now);

                  const rankColor =
                    idx === 0
                      ? 'bg-amber-400 text-slate-950'
                      : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-slate-300';

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-xl font-mono text-xs font-black shrink-0 ${rankColor}`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {getPublicDisplayName(
                              entry.displayName,
                              entry.isAnonymous,
                              entry.userId
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {entry.department ? `${entry.department} · ` : ''}
                            {entry.need === 'pup' ? 'Pup 💩' : 'Cepat ⚡'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-teal-400">
                          {entry.status === 'called' ? 'DIPANGGIL' : `~${estMin} mnt`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Join Info Card with QR hint */}
          <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-r from-teal-950/40 to-slate-900 p-5 backdrop-blur-md flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <QrCode className="h-4 w-4" />
                <span>Mau Masuk Antrean?</span>
              </p>
              <p className="mt-1 font-mono text-sm sm:text-base font-extrabold text-white truncate">
                ngising.gwk.id
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Buka di browser HP Anda untuk ambil nomor antrean
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-slate-950 font-bold shrink-0 shadow-lg">
              <span className="text-xl">📱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar: Auto-Refresh heartbeat */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {connected ? 'Live Sync Wasmer Edge Terhubung' : 'Sedang Menghubungkan...'}
          </span>
          <span className="text-slate-600">·</span>
          <span>{officeState?.onlineCount ?? 1} perangkat aktif</span>
        </div>
        <div>
          <span>Antigravity Smart Office System · Ngising v1.1</span>
        </div>
      </div>
    </div>
  );
}
