import {
  ArrowLeft,
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
import { PoopMascot, type PoopMascotMood } from './PoopAnimations.tsx';

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
        dark: '#000000',
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

  let monitorMood: PoopMascotMood = 'ready';
  if (isMaintenance) {
    monitorMood = 'maintenance';
  } else if (isReserved) {
    monitorMood = 'called';
  } else if (isOccupied) {
    monitorMood = toilet?.occupant?.need === 'pup' ? 'ngeden' : 'cepat';
  }

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
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans overflow-hidden bg-[#0c0c0e] text-white">
      {/* Persona 5 Angular Slashes in Background */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-96 w-[120vw] bg-[#e60012] opacity-20 -rotate-12 transform origin-top-left" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-[120vw] bg-[#e60012] opacity-15 rotate-12 transform origin-bottom-right" />
      <div className="p5-halftone-pattern pointer-events-none absolute inset-0 opacity-10" />

      {/* Top Bar: Persona 5 Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b-2 border-white pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p5-btn-black flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black uppercase text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>KEMBALI</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-[#e60012] border-2 border-white text-white shadow-[3px_3px_0px_#000000]">
              <Tv className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-xl font-black uppercase tracking-tight text-white">
                  BATTLE MONITOR // BILIK UTAMA
                </h1>
                <span className="p5-badge bg-[#e60012] px-2.5 py-0.5 font-mono text-[10px] font-black tracking-wider text-white border border-white">
                  <span className="transform skew-x-[6deg] inline-block">LIVE P5</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono font-bold uppercase">
                {toilet?.location || 'TOILET KANTOR LANTAI 2'} · {toilet?.name || 'BILIK UTAMA'}
              </p>
            </div>
          </div>
        </div>

        {/* Clock & Fullscreen Control */}
        <div className="flex items-center gap-3">
          <div className="border-2 border-white bg-black px-4 py-1.5 text-right shadow-[3px_3px_0px_#e60012]">
            <span className="font-mono text-xl sm:text-3xl font-black tracking-widest text-white tabular-nums">
              {timeString}
            </span>
            <span className="ml-1 text-[11px] font-mono font-black text-[#e60012]">WIB</span>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              {dateString}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)'}
            className="p5-btn-white flex h-11 w-11 items-center justify-center text-black cursor-pointer active:scale-95 shadow-[3px_3px_0px_#000000]"
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
        {/* Left Column (7 cols): Massive High-Legibility Persona Status Card */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <div
            className={`flex flex-1 flex-col justify-between p-6 sm:p-8 lg:p-10 border-4 border-black shadow-[8px_8px_0px_#000000] overflow-hidden ${
              isMaintenance
                ? 'bg-[#151518] text-white'
                : isOccupied
                  ? isOvertime
                    ? 'bg-[#e60012] text-white border-white animate-pulse'
                    : 'bg-[#e60012] text-white border-white'
                  : isReserved
                    ? 'bg-black text-white border-teal-400'
                    : 'bg-white text-black border-black'
            }`}
          >
            {/* Top Indicator Header */}
            <div className="flex items-center justify-between gap-4 border-b-2 border-current pb-4 shrink-0">
              <div className="flex items-center gap-2">
                {isMaintenance ? (
                  <Wrench className="h-5 w-5" />
                ) : isOccupied ? (
                  <DoorClosed className="h-5 w-5" />
                ) : (
                  <DoorOpen className="h-5 w-5" />
                )}
                <span className="font-mono text-xs font-black uppercase tracking-wider">
                  STATUS BILIK TOILET
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase">
                <span
                  className={`h-3 w-3 border border-current ${
                    isMaintenance
                      ? 'bg-amber-400'
                      : isOccupied
                        ? 'bg-white animate-ping'
                        : isReserved
                          ? 'bg-teal-400 animate-ping'
                          : 'bg-[#e60012] animate-pulse'
                  }`}
                />
                <span className="text-sm font-black">
                  {isMaintenance
                    ? 'MAINTENANCE'
                    : isOccupied
                      ? isOvertime
                        ? 'OVERTIME (LEWAT 15 MENIT)'
                        : 'IN USE (TERISI)'
                      : isReserved
                        ? 'RESERVED (DIPANGGIL)'
                        : 'VACANT (KOSONG)'}
                </span>
              </div>
            </div>

            {/* Middle: Massive Visual Status with Animated Comic SVG */}
            <div className="my-auto py-4 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex-1 text-center sm:text-left min-w-0">
                {isMaintenance ? (
                  <div>
                    <h2 className="font-mono text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-amber-400">
                      PERBAIKAN
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-slate-300 font-mono font-bold uppercase">
                      Bilik sementara disterilkan dan dibersihkan.
                    </p>
                  </div>
                ) : isOccupied ? (
                  <div>
                    <div className="inline-block bg-black text-white px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider border-2 border-white mb-3 shadow-[2px_2px_0px_#000000]">
                      {toilet?.occupant?.need === 'pup' ? 'BAB / PUP 💩' : 'BAK / CEPAT ⚡'}
                    </div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white tabular-nums drop-shadow-[4px_4px_0px_#000000]">
                      {formatDuration(elapsedMs)}
                    </h2>
                    <p className="mt-4 font-mono text-base sm:text-2xl font-black text-white uppercase truncate">
                      PENGHUNI:{' '}
                      <span className="underline decoration-4">
                        {toilet?.occupant
                          ? getPublicDisplayName(
                              toilet.occupant.displayName,
                              toilet.occupant.isAnonymous,
                              toilet.occupant.userId
                            )
                          : 'SESEORANG'}
                      </span>
                    </p>
                    {isOvertime && (
                      <div className="mt-4 inline-flex items-center gap-2 border-2 border-white bg-black px-3.5 py-1.5 font-mono text-xs font-black text-[#ff4d4d] shadow-[3px_3px_0px_#000000]">
                        <span>DURASI MELEBIHI 15 MENIT · MOHON KERJASAMA!</span>
                      </div>
                    )}
                  </div>
                ) : isReserved ? (
                  <div>
                    <div className="inline-block bg-[#e60012] text-white px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider border-2 border-white mb-3">
                      GILIRAN DIPANGGIL!
                    </div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-teal-300 tabular-nums drop-shadow-[4px_4px_0px_#000000]">
                      {formatDuration(reserveRemainingMs)}
                    </h2>
                    <p className="mt-4 font-mono text-base sm:text-2xl font-black text-white uppercase truncate">
                      TARGET:{' '}
                      <span className="text-teal-300">
                        {toilet?.reservedFor
                          ? getPublicDisplayName(
                              toilet.reservedFor.displayName,
                              false,
                              toilet.reservedFor.userId
                            )
                          : 'PEMENANG ANTREAN'}
                      </span>
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-teal-200 font-mono font-bold uppercase">
                      Segera masuk sebelum waktu reservasi hangus!
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-mono text-6xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tight text-black drop-shadow-[4px_4px_0px_#e60012]">
                      KOSONG!
                    </h2>
                    <p className="mt-4 font-mono text-lg sm:text-2xl font-black uppercase text-black">
                      Bilik toilet siap diserbu sekarang.
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-slate-800 font-mono font-bold uppercase">
                      Silakan masuk dan tekan &quot;Masuk Toilet&quot; di HP Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Persona Comic Mascot Visual */}
              <div className="shrink-0 flex items-center justify-center p-3">
                <PoopMascot mood={monitorMood} size={150} interactive={true} />
              </div>
            </div>

            {/* Bottom Meta Bar inside Status Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-current pt-3 text-xs font-mono font-black uppercase shrink-0">
              <span>{toilet?.name || 'Bilik Utama'}</span>
              <span>KAPASITAS: 1 ORANG // PHANTOM SYSTEM</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Persona 5 Queue List */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          {/* Queue Box */}
          <div className="p5-card flex flex-1 flex-col p-5 min-h-0 relative overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                  ANTREAN BERIKUTNYA
                </span>
                <span className="p5-badge bg-[#e60012] px-2 py-0.5 font-mono text-xs font-black text-white border border-white">
                  <span className="transform skew-x-[6deg] inline-block">{queue.length}</span>
                </span>
              </div>
              <span className="font-mono text-[11px] font-black text-slate-400">ESTIMASI</span>
            </div>

            <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center font-mono text-xs">
                  <p className="font-black text-white text-sm uppercase">TIDAK ADA ANTREAN</p>
                  <p className="mt-1 text-[11px] text-slate-400 font-bold uppercase">
                    Bilik saat ini bebas antrean. Silakan langsung serbu!
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
                      className="flex items-center justify-between gap-3 border-2 border-black bg-black p-2.5 font-mono text-xs shadow-[2px_2px_0px_#000000]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-6 w-6 items-center justify-center border-2 font-black text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-[#e60012] text-white border-white'
                              : 'bg-white text-black border-black'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-white uppercase">
                            {getPublicDisplayName(
                              entry.displayName,
                              entry.isAnonymous,
                              entry.userId
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            {entry.need === 'pup' ? 'BAB (SANTAI) 💩' : 'BAK (CEPAT) ⚡'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black ${
                            entry.status === 'called' ? 'text-[#ff4d4d]' : 'text-white'
                          }`}
                        >
                          {entry.status === 'called' ? 'DIPANGGIL' : `~${estMin} MNT`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Join Callout Box with Scannable QR Code */}
          <div className="border-2 border-white bg-black p-4 font-mono text-xs flex items-center justify-between gap-4 shadow-[4px_4px_0px_#e60012] shrink-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#e60012] flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>SCAN DENGAN PONSEL</span>
              </span>
              <p className="text-base font-black text-white mt-1 truncate uppercase">ngising.gwk.id</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-bold">
                Scan QR code untuk langsung masuk antrean atau pantau bilik dari HP
              </p>
            </div>

            <div className="shrink-0 p-1 bg-white border-2 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code ngising.gwk.id"
                  className="h-20 w-20 sm:h-22 sm:w-22 object-contain"
                />
              ) : (
                <div className="h-20 w-20 sm:h-22 sm:w-22 bg-slate-100 animate-pulse flex items-center justify-center text-[10px] text-slate-400 font-black">
                  QR...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Motivational Running Quote Ticker + Diagnostic Footer in Persona 5 Comic Style */}
      <footer className="relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-3 border-t-2 border-white pt-3 font-mono text-[11px]">
        {/* Animated Funny Motivational Quote in Comic Dialogue Balloon */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p5-badge bg-[#e60012] text-white px-2 py-0.5 text-[10px] font-black shrink-0 border border-white">
            <span className="transform skew-x-[6deg] inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>KATA MUTIARA</span>
            </span>
          </div>
          <div className="overflow-hidden h-6 flex items-center min-w-0 bg-black border border-white px-3 py-1 shadow-[2px_2px_0px_#000000] flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="font-sans italic font-black text-white truncate text-xs"
              >
                {MOTIVATIONAL_QUOTES[quoteIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-bold uppercase shrink-0">
          <div className="flex items-center gap-1.5">
            {connected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-black">
                <Wifi className="h-3.5 w-3.5" />
                <span>LIVE SYNC</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#e60012] font-black">
                <WifiOff className="h-3.5 w-3.5" />
                <span>TERPUTUS</span>
              </span>
            )}
            <span>·</span>
            <span>{officeState?.onlineCount ?? 1} USER</span>
          </div>
          <span>·</span>
          <span>PHANTOM NGISING SYSTEM</span>
        </div>
      </footer>
    </div>
  );
}
