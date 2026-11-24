import {
  ArrowLeft,
  Clock,
  DoorClosed,
  DoorOpen,
  Expand,
  Minimize,
  QrCode,
  Tv,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  OVERTIME_THRESHOLD_MS,
  estimateWaitMinutes,
  formatDuration,
  getPublicDisplayName,
} from '../shared/queueLogic.ts';
import type { OfficeState } from '../shared/types.ts';

interface DisplayMonitorViewProps {
  officeState: OfficeState | null;
  now: number;
  connected: boolean;
  lastSyncedAt: number;
  onExit?: () => void;
}

export function DisplayMonitorView({
  officeState,
  now,
  connected,
  onExit,
}: DisplayMonitorViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ngising.gwk.id';
    QRCode.toDataURL(origin, {
      margin: 1,
      width: 140,
      color: {
        dark: '#241407',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, []);

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
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex h-full w-full flex-col justify-between p-4 sm:p-8 select-none font-sans overflow-y-auto">
      {/* Top Bar: Clean Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#c99f57]/20 pb-4">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[#dbc08b] hover:border-[#c99f57] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c5d1d] to-[#3e2610] border border-[#c99f57]/40 text-[#dbc08b] shadow-lg">
              <Tv className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  MONITOR BILIK
                </h1>
                <span className="rounded-full bg-[#ad7c2b]/30 px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-[#e8d9b5] border border-[#c99f57]/40">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[#dbc08b]/80 font-mono">
                {toilet?.location || 'TOILET LANTAI 2'} · {toilet?.name || 'BILIK UTAMA'}
              </p>
            </div>
          </div>
        </div>

        {/* Clock & Fullscreen Control */}
        <div className="flex items-center gap-3">
          <div className="glass-card border border-[#c99f57]/30 px-4 py-1.5 rounded-2xl text-right">
            <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white tabular-nums">
              {timeString}
            </span>
            <span className="ml-1 text-[11px] font-mono font-bold text-[#dbc08b]">WIB</span>
            <p className="text-[10px] font-mono text-[#dbc08b]/70 uppercase tracking-wider">
              {dateString}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)'}
            className="glass-pill flex h-11 w-11 items-center justify-center rounded-2xl text-[#dbc08b] hover:border-[#c99f57] hover:text-white transition-all cursor-pointer active:scale-95 shadow-md"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Expand className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Grid: Left Status + Right Queue */}
      <main className="my-6 grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1 items-stretch">
        {/* Left Column (7 cols): Massive High-Legibility Status Card */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            className={`flex flex-1 flex-col justify-between rounded-3xl p-6 sm:p-10 transition-colors glass-card ${
              isMaintenance
                ? 'border-slate-700 bg-slate-900/80 text-slate-300'
                : isOccupied
                  ? isOvertime
                    ? 'border-rose-500/80 bg-rose-950/40 text-rose-100 ring-2 ring-rose-500/40'
                    : 'border-[#c99f57]/80 bg-[#3e2610]/50 text-amber-100 ring-2 ring-[#ad7c2b]/30'
                  : isReserved
                    ? 'border-teal-500/80 bg-teal-950/40 text-teal-100'
                    : 'border-emerald-500/80 bg-emerald-950/30 text-emerald-100'
            }`}
          >
            {/* Top Indicator Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                {isMaintenance ? (
                  <Wrench className="h-5 w-5 text-amber-400" />
                ) : isOccupied ? (
                  <DoorClosed className="h-5 w-5 text-rose-400" />
                ) : (
                  <DoorOpen className="h-5 w-5 text-emerald-400" />
                )}
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#dbc08b]">
                  STATUS BILIK
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isMaintenance
                      ? 'bg-amber-400'
                      : isOccupied
                        ? 'bg-rose-500 animate-pulse'
                        : isReserved
                          ? 'bg-teal-400 animate-pulse'
                          : 'bg-emerald-400'
                  }`}
                />
                <span className="text-white">
                  {isMaintenance
                    ? 'MAINTENANCE'
                    : isOccupied
                      ? isOvertime
                        ? 'OVERTIME'
                        : 'IN USE'
                      : isReserved
                        ? 'CALLED'
                        : 'VACANT'}
                </span>
              </div>
            </div>

            {/* Middle: Massive Visual Status */}
            <div className="my-8 text-center sm:text-left">
              {isMaintenance ? (
                <div>
                  <h2 className="font-mono text-4xl sm:text-6xl font-black uppercase tracking-tight text-amber-400">
                    SEDANG PERBAIKAN
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-slate-400 font-mono">
                    Bilik sementara tidak dapat digunakan untuk pembersihan rutin.
                  </p>
                </div>
              ) : isOccupied ? (
                <div>
                  <div className="inline-block rounded-xl bg-rose-500/20 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-rose-200 border border-rose-500/40 mb-3">
                    {toilet?.occupant?.need === 'pup' ? 'BAB / Pup 💩' : 'BAK / Cepat ⚡'}
                  </div>
                  <h2 className="font-mono text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white tabular-nums">
                    {formatDuration(elapsedMs)}
                  </h2>
                  <p className="mt-4 font-mono text-base sm:text-xl font-bold text-white">
                    Sedang Dipakai:{' '}
                    <span className="text-[#dbc08b]">
                      {toilet?.occupant
                        ? getPublicDisplayName(
                            toilet.occupant.displayName,
                            toilet.occupant.isAnonymous,
                            toilet.occupant.userId
                          )
                        : 'Seseorang'}
                    </span>
                    {toilet?.occupant?.department && (
                      <span className="text-[#dbc08b]/70 text-sm font-normal ml-2">
                        ({toilet.occupant.department})
                      </span>
                    )}
                  </p>
                  {isOvertime && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3.5 py-1.5 font-mono text-xs font-bold text-rose-300">
                      <span>DURASI MELEBIHI 15 MENIT · MOHON PENGERTIAN</span>
                    </div>
                  )}
                </div>
              ) : isReserved ? (
                <div>
                  <div className="inline-block rounded-xl bg-teal-500/20 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-teal-300 border border-teal-500/40 mb-3">
                    GILIRAN DIPANGGIL
                  </div>
                  <h2 className="font-mono text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-teal-300 tabular-nums">
                    {formatDuration(reserveRemainingMs)}
                  </h2>
                  <p className="mt-4 font-mono text-base sm:text-xl font-bold text-white">
                    Menunggu:{' '}
                    <span className="text-teal-300">
                      {toilet?.reservedFor
                        ? getPublicDisplayName(
                            toilet.reservedFor.displayName,
                            false,
                            toilet.reservedFor.userId
                          )
                        : 'Pemenang Antrean'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-teal-200/80 font-mono">
                    Silakan segera masuk sebelum batas waktu reservasi habis.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="font-mono text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight text-emerald-400">
                    KOSONG
                  </h2>
                  <p className="mt-4 font-mono text-base sm:text-xl font-bold text-white">
                    Bilik toilet siap digunakan sekarang.
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-[#dbc08b]/80 font-mono">
                    Silakan masuk dan tap &quot;Masuk Toilet&quot; di ponsel Anda.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Meta Bar inside Status Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs font-mono text-[#dbc08b]/80">
              <span>{toilet?.name || 'Bilik Utama'}</span>
              <span>Kapasitas: 1 Orang</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Clean Tabular Queue List */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Queue Box */}
          <div className="flex flex-1 flex-col rounded-3xl p-5 glass-card">
            <div className="flex items-center justify-between border-b border-[#c99f57]/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#dbc08b]">
                  ANTREAN BERIKUTNYA
                </span>
                <span className="rounded-lg bg-[#ad7c2b]/30 px-2 py-0.5 font-mono text-xs font-black text-white border border-[#c99f57]/30">
                  {queue.length}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#dbc08b]/70">ESTIMASI</span>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center text-center text-[#dbc08b]/60 font-mono text-xs">
                  <p className="font-bold text-white">TIDAK ADA ANTREAN</p>
                  <p className="mt-1 text-[11px] text-[#dbc08b]/70">
                    Bilik saat ini bebas dari antrean.
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

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#c99f57]/20 bg-[#241407]/60 px-3 py-2.5 font-mono text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-lg font-bold text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'bg-[#3e2610] text-[#dbc08b] border border-[#c99f57]/30'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {getPublicDisplayName(
                              entry.displayName,
                              entry.isAnonymous,
                              entry.userId
                            )}
                          </p>
                          <p className="text-[10px] text-[#dbc08b]/70">
                            {entry.need === 'pup' ? 'BAB (Santai)' : 'BAK (Cepat)'}
                            {entry.department ? ` · ${entry.department}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black ${
                            entry.status === 'called' ? 'text-teal-400' : 'text-white'
                          }`}
                        >
                          {entry.status === 'called' ? 'DIPANGGIL' : `~${estMin} mnt`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Join Callout Box with Scannable QR Code */}
          <div className="rounded-2xl p-4 font-mono text-xs flex items-center justify-between gap-4 glass-card border border-[#c99f57]/30">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#dbc08b] flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>SCAN DENGAN PONSEL</span>
              </span>
              <p className="text-sm font-black text-white mt-1 truncate">ngising.gwk.id</p>
              <p className="text-[11px] text-[#dbc08b]/80 mt-0.5 leading-relaxed">
                Scan QR code untuk langsung masuk antrean atau pantau bilik dari HP
              </p>
            </div>

            <div className="shrink-0 p-1.5 bg-white rounded-xl border border-[#c99f57]/40 shadow-lg flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code ngising.gwk.id"
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-lg"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                  QR...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Diagnostic Bar */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#c99f57]/20 pt-3 font-mono text-[11px] text-[#dbc08b]/80">
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Wifi className="h-3 w-3" />
              <span>LIVE SYNC AKTIF</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <WifiOff className="h-3 w-3" />
              <span>TERPUTUS</span>
            </span>
          )}
          <span>·</span>
          <span>ONLINE: {officeState?.onlineCount ?? 1} USER</span>
        </div>
        <div>
          <span>NGISING SMART OFFICE · V1.3</span>
        </div>
      </footer>
    </div>
  );
}
