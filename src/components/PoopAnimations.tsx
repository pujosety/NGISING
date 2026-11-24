import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { soundEffects } from '../utils/soundEffects.ts';

export type PoopMascotMood =
  | 'ready'
  | 'ngeden'
  | 'cepat'
  | 'called'
  | 'maintenance'
  | 'exhausted';

export type PoopBurstKind = 'occupy' | 'release' | 'queue' | 'leave' | 'quota_full';

export interface PoopBurstEvent {
  id: number;
  kind: PoopBurstKind;
}

export const FUN_TOILET_QUOTES = [
  'Jangan ditahan bro, nanti jadi batu ginjal! 🚽',
  'Bilik toilet: zona bebas chat Slack & revisi klien! 🧘',
  'Fokus, tarik nafas dalam, dorong perlahan... 💨',
  'Plung! Satu beban pikiran terlepas ke alam semesta! ✨',
  'Ngising hening, pikiran jernih, coding makin lancar! 💻',
  'Pencet lagi kalau mau denger suara merdu! 🎺',
  'Jangan main reels kelamaan ya, yang antre udah gelisah! ⏰',
  'Nikmat kebebasan hakiki setelah meeting 3 jam! 🧻',
  'Tetap tenang walau perut sedang bergejolak hebat! ⚡',
  'Ingat siram sampai tuntas dan cuci tangan bersih! 🧼',
];

export function PoopMiniIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20.5 6C20.5 6 24.5 9.5 23 13C26.5 13.5 28.5 16.5 27.5 19.5C31 20.5 33 23.5 32 27C33.5 28.5 33.5 32 30.5 33.5C27.5 35 12.5 35 9.5 33.5C6.5 32 6.5 28.5 8 27C7 23.5 9 20.5 12.5 19.5C11.5 16.5 13.5 13.5 17 13C15.5 9.8 20.5 6 20.5 6Z"
        fill="#8B5A2B"
        stroke="#5C3816"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="1.7" fill="#FFFDF9" />
      <circle cx="24" cy="24" r="1.7" fill="#FFFDF9" />
      <circle cx="16.2" cy="24.2" r="0.9" fill="#2A180B" />
      <circle cx="24.2" cy="24.2" r="0.9" fill="#2A180B" />
      <path
        d="M17.5 27.5C18.8 28.8 21.2 28.8 22.5 27.5"
        stroke="#2A180B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PoopMascot({
  mood,
  size = 56,
  interactive = true,
  className = '',
}: {
  mood: PoopMascotMood;
  size?: number;
  interactive?: boolean;
  className?: string;
}) {
  const [clicked, setClicked] = useState(false);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);

  const isNgeden = mood === 'ngeden';
  const isCepat = mood === 'cepat';
  const isCalled = mood === 'called';
  const isExhausted = mood === 'exhausted';
  const isMaintenance = mood === 'maintenance';

  const bodyAnimate = isNgeden
    ? { rotate: [-4, 4, -4], scale: [1, 1.05, 0.98, 1] }
    : isCalled
      ? { y: [0, -8, 0], scale: [1, 1.07, 1] }
      : isCepat
        ? { y: [0, -5, 0], x: [-2, 2, -2] }
        : isExhausted
          ? { y: [0, 1.5, 0], opacity: [0.88, 1, 0.88] }
          : { y: [0, -3.5, 0], rotate: [0, -1.5, 1.5, 0] };

  const bodyDuration = isNgeden
    ? 0.55
    : isCalled
      ? 0.7
      : isCepat
        ? 0.65
        : isExhausted
          ? 2.8
          : 2.2;

  const handleClick = () => {
    if (!interactive) return;
    setClicked(true);
    soundEffects.playMascotToot();
    const randomQuote =
      FUN_TOILET_QUOTES[Math.floor(Math.random() * FUN_TOILET_QUOTES.length)];
    setActiveQuote(randomQuote);

    setTimeout(() => {
      setClicked(false);
    }, 450);

    setTimeout(() => {
      setActiveQuote(null);
    }, 3200);
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Interactive Speech Bubble */}
      <AnimatePresence>
        {activeQuote && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 min-w-[170px] max-w-[240px] pointer-events-none"
          >
            <div className="relative rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 shadow-md">
              <p className="leading-snug text-center">{activeQuote}</p>
              {/* Bubble Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-amber-50 border-r border-b border-amber-200 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating extra details depending on mood */}
      {isNgeden && (
        <motion.span
          className="absolute -right-1 top-1 text-[11px] font-bold text-sky-500"
          animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        >
          💧
        </motion.span>
      )}

      {isExhausted && (
        <motion.span
          className="absolute -top-1 right-0 font-mono text-[10px] font-bold text-slate-400"
          animate={{ y: [0, -6], opacity: [0.3, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        >
          zZz
        </motion.span>
      )}

      {isCalled && (
        <motion.span
          className="absolute -top-1.5 -right-1 text-xs"
          animate={{ rotate: [-15, 15, -15], scale: [0.95, 1.15, 0.95] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          ✨
        </motion.span>
      )}

      <motion.button
        type="button"
        tabIndex={interactive ? 0 : -1}
        onClick={handleClick}
        title={interactive ? 'Klik Si Plop untuk sapaan! 💩' : undefined}
        className={`w-full h-full p-0 bg-transparent border-0 flex items-center justify-center outline-none ${
          interactive
            ? 'cursor-pointer hover:brightness-105 active:scale-95 transition-all'
            : 'pointer-events-none'
        }`}
        whileHover={interactive ? { scale: 1.08, rotate: [0, -3, 3, 0] } : undefined}
        whileTap={interactive ? { scale: 0.88 } : undefined}
      >
        <motion.svg
          viewBox="0 0 64 64"
          fill="none"
          className="w-full h-full"
          animate={
            clicked
              ? { scale: [1, 1.25, 0.88, 1.05, 1], rotate: [-8, 8, -4, 4, 0] }
              : bodyAnimate
          }
          transition={{
            duration: clicked ? 0.45 : bodyDuration,
            repeat: clicked ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Base soft shadow */}
          <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#E2E8F0" />

          {/* Swirled poop body */}
          <path
            d="M33 9C33 9 39.5 14.5 37 20C43 20.8 46.5 25.5 44.8 30.5C50.5 32 53.5 37 51.8 42.5C54.2 45 54 50.5 49 52.5C44 54.5 20 54.5 15 52.5C10 50.5 9.8 45 12.2 42.5C10.5 37 13.5 32 19.2 30.5C17.5 25.5 21 20.8 27 20C24.5 15 33 9 33 9Z"
            fill={isMaintenance ? '#94A3B8' : isExhausted ? '#A17C5B' : '#8B5A2B'}
            stroke={isMaintenance ? '#475569' : '#5C3816'}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Highlight ridge */}
          <path
            d="M21 35.5C24.5 33.8 39.5 33.8 43 35.5"
            stroke={isMaintenance ? '#CBD5E1' : '#A87442'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 25.5C27 24.3 37 24.3 40 25.5"
            stroke={isMaintenance ? '#CBD5E1' : '#A87442'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Rosy cheeks */}
          {!isMaintenance && (
            <>
              <ellipse cx="21" cy="43.5" rx="2.8" ry="1.6" fill="#F59E0B" fillOpacity="0.45" />
              <ellipse cx="43" cy="43.5" rx="2.8" ry="1.6" fill="#F59E0B" fillOpacity="0.45" />
            </>
          )}

          {/* Facial expressions */}
          {isNgeden ? (
            <>
              {/* >< straining eyes */}
              <path d="M22 37L26.5 39.5L22 42" stroke="#2A180B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M42 37L37.5 39.5L42 42" stroke="#2A180B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {/* wavy clenched mouth */}
              <path d="M27 46.5Q29.5 44.5 32 46.5T37 46.5" stroke="#2A180B" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : isExhausted ? (
            <>
              {/* sleepy closed eyes */}
              <path d="M21 40Q24 42.5 27 40" stroke="#2A180B" strokeWidth="2.1" strokeLinecap="round" />
              <path d="M37 40Q40 42.5 43 40" stroke="#2A180B" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="32" cy="46.5" r="2" fill="#2A180B" />
            </>
          ) : isMaintenance ? (
            <>
              <circle cx="24.5" cy="39.5" r="2.5" fill="#1E293B" />
              <circle cx="39.5" cy="39.5" r="2.5" fill="#1E293B" />
              <path d="M27 46H37" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* bright cute eyes */}
              <circle cx="24.5" cy="39.5" r="3" fill="#FFFDF9" />
              <circle cx="39.5" cy="39.5" r="3" fill="#FFFDF9" />
              <circle cx="25" cy="39.8" r="1.6" fill="#2A180B" />
              <circle cx="40" cy="39.8" r="1.6" fill="#2A180B" />
              <path
                d={
                  isCalled
                    ? 'M26 44.5C28.5 49 35.5 49 38 44.5'
                    : 'M27.5 45C29.5 47.5 34.5 47.5 36.5 45'
                }
                stroke="#2A180B"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </>
          )}
        </motion.svg>
      </motion.button>
    </div>
  );
}

const BURST_PARTICLES = [
  { x: -90, y: -65, rot: -30, delay: 0, emoji: '💩' },
  { x: -55, y: -95, rot: 20, delay: 0.03, emoji: '✨' },
  { x: -18, y: -80, rot: -15, delay: 0.01, emoji: '🧻' },
  { x: 24, y: -92, rot: 25, delay: 0.04, emoji: '💧' },
  { x: 68, y: -72, rot: -20, delay: 0.02, emoji: '✨' },
  { x: 95, y: -45, rot: 32, delay: 0.05, emoji: '🎉' },
  { x: -75, y: -30, rot: -35, delay: 0.06, emoji: '🫧' },
];

const BURST_LABELS: Record<PoopBurstKind, { text: string; tone: string; icon: string }> = {
  occupy: {
    text: 'Plop! Timer Ngising Dimulai!',
    tone: 'border-teal-500 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-teal-500/25',
    icon: '💩',
  },
  release: {
    text: 'Plung! Lega Banget!',
    tone: 'border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25',
    icon: '✨',
  },
  queue: {
    text: 'Nomor Antrean Diamankan!',
    tone: 'border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-slate-900/25',
    icon: '⏳',
  },
  leave: {
    text: 'Antrean Dibatalkan',
    tone: 'border-slate-300 bg-white text-slate-800 shadow-slate-200',
    icon: '👋',
  },
  quota_full: {
    text: 'Kuota 10/10 Hari Ini Habis!',
    tone: 'border-red-500 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-500/25',
    icon: '🛑',
  },
};

export function PoopInteractionBurst({ event }: { event: PoopBurstEvent | null }) {
  const cfg = event ? BURST_LABELS[event.kind] : null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center justify-center lg:bottom-12"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {event && cfg && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 22, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            className="relative flex items-center justify-center"
          >
            {event.kind !== 'leave' &&
              BURST_PARTICLES.map((p, idx) => (
                <motion.div
                  key={idx}
                  className="absolute text-lg select-none"
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    scale: [0.4, 1.25, 0.85],
                    opacity: [1, 1, 0],
                    rotate: p.rot,
                  }}
                  transition={{
                    duration: 0.95,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                >
                  <span>{p.emoji}</span>
                </motion.div>
              ))}

            <div
              className={`inline-flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-bold shadow-xl backdrop-blur-sm ${cfg.tone}`}
            >
              <span className="text-base">{cfg.icon}</span>
              <span>{cfg.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
