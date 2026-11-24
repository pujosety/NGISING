import {
  ArrowLeft,
  Clock,
  DoorClosed,
  DoorOpen,
  Expand,
  Minimize,
  QrCode,
  Sparkles,
  Tv,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

const MOTIVATIONAL_QUOTES = [
  '“Keluarkankah beban hidupmu satu per satu, jangan ditahan!”',
  '“Ngeden adalah seni perjuangan tanpa penonton.”',
  '“Sukses berawal dari perut yang tenang dan plong.”',
  '“Jangan pernah menyerah sebelum bunyi cebur terdengar!”',
  '“Di balik kerja keras ada toilet yang memberi rasa lega.”',
  '“Fokus, tenang, dan biarkan gravitasi melakukan tugasnya.”',
  '“Puncak produktivitas kantor berakar dari toilet yang kosong.”',
  '“Tarik napas dalam, hembuskan perlahan, lepaskan segalanya.”',
];

export function DisplayMonitorView({
  officeState,
  now,
  connected,
  onExit,
}: DisplayMonitorViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Rotate motivational quotes every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans overflow-hidden bg-[#120c08] text-[#f7efe6]">
      {/* Dynamic ambient background orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,#ad7c2b,transparent_70%)] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,#6f4717,transparent_70%)] opacity-30 blur-3xl" />

      {/* Top Bar: Clean Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-[#c99f57]/20 pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="glass-pill flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#dbc08b] hover:border-[#c99f57] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c5d1d] to-[#3e2610] border border-[#c99f57]/40 text-[#dbc08b] shadow-lg">
              <Tv className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-xl font-black tracking-tight text-white uppercase">
                  MONITOR BILIK UTAMA
                </h1>
                <span className="rounded-full bg-[#ad7c2b]/30 px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wider text-[#e8d9b5] border border-[#c99f57]/40 animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[#dbc08b]/80 font-mono">
                {toilet?.location || 'TOILET KANTOR LANTAI 2'} · {toilet?.name || 'BILIK UTAMA'}
              </p>
            </div>
          </div>
        </div>

        {/* Clock & Fullscreen Control */}
        <div className="flex items-center gap-3">
          <div className="glass-card border border-[#c99f57]/30 px-4 py-1.5 rounded-2xl text-right shadow-md">
            <span className="font-mono text-xl sm:text-3xl font-black tracking-widest text-white tabular-nums">
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

      {/* Main Grid: Left Status + Right Queue (Fills Remaining Screen Height) */}
      <main className="relative z-10 my-3 sm:my-4 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 flex-1 min-h-0 items-stretch">
        {/* Left Column (7 cols): Massive High-Legibility Status Card */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <div
            className={`flex flex-1 flex-col justify-between rounded-3xl p-6 sm:p-8 lg:p-10 transition-colors glass-card overflow-hidden ${
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
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-2">
                {isMaintenance ? (
                  <Wrench className="h-5 w-5 text-amber-400" />
                ) : isOccupied ? (
                  <DoorClosed className="h-5 w-5 text-rose-400" />
                ) : (
                  <DoorOpen className="h-5 w-5 text-emerald-400" />
                )}
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#dbc08b]">
                  STATUS BILIK TOILET
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase">
                <span
                  className={`h-3 w-3 rounded-full ${
                    isMaintenance
                      ? 'bg-amber-400'
                      : isOccupied
                        ? 'bg-rose-500 animate-ping'
                        : isReserved
                          ? 'bg-teal-400 animate-ping'
                          : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span className="text-white text-sm font-extrabold">
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

            {/* Middle: Massive Visual Status with Animated SVG */}
            <div className="my-auto py-4 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex-1 text-center sm:text-left min-w-0">
                {isMaintenance ? (
                  <div>
                    <h2 className="font-mono text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-amber-400">
                      PERBAIKAN
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[#dbc08b]/80 font-mono">
                      Bilik sementara disterilkan dan dibersihkan.
                    </p>
                  </div>
                ) : isOccupied ? (
                  <div>
                    <div className="inline-block rounded-xl bg-rose-500/20 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-rose-200 border border-rose-500/40 mb-3">
                      {toilet?.occupant?.need === 'pup' ? 'BAB / Pup 💩' : 'BAK / Cepat ⚡'}
                    </div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white tabular-nums drop-shadow-lg">
                      {formatDuration(elapsedMs)}
                    </h2>
                    <p className="mt-4 font-mono text-base sm:text-2xl font-bold text-white truncate">
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
                    </p>
                    {toilet?.occupant?.department && (
                      <p className="text-[#dbc08b]/70 text-xs sm:text-sm font-mono mt-1">
                        Divisi: {toilet.occupant.department}
                      </p>
                    )}
                    {isOvertime && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3.5 py-1.5 font-mono text-xs font-bold text-rose-300">
                        <span>DURASI MELEBIHI 15 MENIT · MOHON KERJASAMA</span>
                      </div>
                    )}
                  </div>
                ) : isReserved ? (
                  <div>
                    <div className="inline-block rounded-xl bg-teal-500/20 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-teal-300 border border-teal-500/40 mb-3">
                      GILIRAN DIPANGGIL
                    </div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-teal-300 tabular-nums drop-shadow-lg">
                      {formatDuration(reserveRemainingMs)}
                    </h2>
                    <p className="mt-4 font-mono text-base sm:text-2xl font-bold text-white truncate">
                      Panggilan:{' '}
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
                    <p className="mt-1 text-xs sm:text-sm text-teal-200/80 font-mono">
                      Segera masuk sebelum kuota waktu reservasi hangus!
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tight text-emerald-400 drop-shadow-lg">
                      KOSONG
                    </h2>
                    <p className="mt-4 font-mono text-lg sm:text-2xl font-bold text-white">
                      Bilik toilet siap digunakan sekarang.
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-[#dbc08b]/80 font-mono">
                      Silakan masuk dan tekan &quot;Masuk Toilet&quot; di ponsel Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Animated Cute SVG Mascot Visual */}
              <div className="shrink-0 flex items-center justify-center p-3">
                <motion.svg
                  animate={{
                    y: isOccupied ? [0, -4, 0] : [0, -8, 0],
                    rotate: isOccupied ? [-1, 1, -1] : [-3, 3, -3],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isOccupied ? 2.5 : 4,
                    ease: 'easeInOut',
                  }}
                  viewBox="0 0 120 120"
                  className="h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44 drop-shadow-2xl"
                >
                  <defs>
                    <linearGradient id="poopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c99f57" />
                      <stop offset="50%" stopColor="#8c5d1d" />
                      <stop offset="100%" stopColor="#3e2610" />
                    </linearGradient>
                    <filter id="glow">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#c99f57" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* Poop Body Shapes */}
                  <g filter="url(#glow)">
                    {/* Bottom tier */}
                    <path
                      d="M 22 96 C 20 80, 100 80, 98 96 C 96 108, 24 108, 22 96 Z"
                      fill="url(#poopGrad)"
                    />
                    {/* Middle tier */}
                    <path
                      d="M 30 76 C 26 62, 94 62, 90 76 C 88 88, 32 88, 30 76 Z"
                      fill="url(#poopGrad)"
                    />
                    {/* Upper swirl */}
                    <path
                      d="M 40 56 C 36 40, 84 40, 80 56 C 76 66, 44 66, 40 56 Z"
                      fill="url(#poopGrad)"
                    />
                    {/* Top curly swirl */}
                    <path
                      d="M 50 38 C 45 22, 68 18, 62 30 C 58 38, 52 38, 50 38 Z"
                      fill="url(#poopGrad)"
                    />
                  </g>

                  {/* Cute Eyes */}
                  {isOccupied ? (
                    // Straining / Focusing Eyes
                    <>
                      <circle cx="48" cy="68" r="4.5" fill="#ffffff" />
                      <circle cx="49" cy="68" r="2.5" fill="#17110c" />
                      <circle cx="72" cy="68" r="4.5" fill="#ffffff" />
                      <circle cx="71" cy="68" r="2.5" fill="#17110c" />
                      {/* Sweat drop */}
                      <motion.path
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, 3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        d="M 84 56 C 82 52, 88 52, 86 56 C 85 58, 83 58, 84 56 Z"
                        fill="#67e8f9"
                      />
                    </>
                  ) : (
                    // Happy / Cheerful Eyes
                    <>
                      <circle cx="46" cy="66" r="6" fill="#ffffff" />
                      <circle cx="47.5" cy="65" r="3.5" fill="#17110c" />
                      <circle cx="49" cy="63.5" r="1.5" fill="#ffffff" />

                      <circle cx="74" cy="66" r="6" fill="#ffffff" />
                      <circle cx="72.5" cy="65" r="3.5" fill="#17110c" />
                      <circle cx="74" cy="63.5" r="1.5" fill="#ffffff" />

                      {/* Blushing cheeks */}
                      <ellipse cx="38" cy="74" rx="5" ry="3" fill="#f43f5e" opacity="0.6" />
                      <ellipse cx="82" cy="74" rx="5" ry="3" fill="#f43f5e" opacity="0.6" />
                      {/* Big Smile */}
                      <path
                        d="M 50 75 Q 60 85 70 75"
                        stroke="#17110c"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </>
                  )}
                </motion.svg>
              </div>
            </div>

            {/* Bottom Meta Bar inside Status Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs font-mono text-[#dbc08b]/80 shrink-0">
              <span>{toilet?.name || 'Bilik Utama'}</span>
              <span>Kapasitas: 1 Orang</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Clean Tabular Queue List */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          {/* Queue Box */}
          <div className="flex flex-1 flex-col rounded-3xl p-5 glass-card min-h-0">
            <div className="flex items-center justify-between border-b border-[#c99f57]/15 pb-3 shrink-0">
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
                <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center text-[#dbc08b]/60 font-mono text-xs">
                  <p className="font-bold text-white text-sm">TIDAK ADA ANTREAN</p>
                  <p className="mt-1 text-[11px] text-[#dbc08b]/70">
                    Bilik saat ini bebas antrean. Silakan langsung masuk!
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#c99f57]/20 bg-[#241407]/60 px-3 py-2 font-mono text-xs"
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
          <div className="rounded-2xl p-4 font-mono text-xs flex items-center justify-between gap-4 glass-card border border-[#c99f57]/30 shrink-0">
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
                  className="h-20 w-20 sm:h-22 sm:w-22 object-contain rounded-lg"
                />
              ) : (
                <div className="h-20 w-20 sm:h-22 sm:w-22 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                  QR...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Motivational Running Quote Ticker + Diagnostic Footer */}
      <footer className="relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#c99f57]/20 pt-3 font-mono text-[11px]">
        {/* Animated Funny Motivational Quote */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles className="h-4 w-4 text-[#dbc08b] shrink-0 animate-spin" />
          <div className="overflow-hidden h-5 flex items-center min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="font-sans italic font-bold text-[#dbc08b] truncate text-xs"
              >
                {MOTIVATIONAL_QUOTES[quoteIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[#dbc08b]/80 shrink-0">
          <div className="flex items-center gap-1.5">
            {connected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Wifi className="h-3 w-3" />
                <span>LIVE SYNC</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <WifiOff className="h-3 w-3" />
                <span>TERPUTUS</span>
              </span>
            )}
            <span>·</span>
            <span>{officeState?.onlineCount ?? 1} USER</span>
          </div>
          <span>·</span>
          <span>NGISING SMART OFFICE</span>
        </div>
      </footer>
    </div>
  );
}
