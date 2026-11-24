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
  'TAKE YOUR TURN! Jangan ditahan bro! 🚽',
  'BILIK TOILET: ZONA BEBAS SLACK & REVISI! 🧘',
  'FOKUS, NAFAS DALAM, DORONG PERLAHAN... 💨',
  'PLUNG! SATU BEBAN HIDUP TERLEPAS! ✨',
  'NGISING HENING, CODING MAKIN LANCAR! 💻',
  'ALL-OUT FLUSH! SIRAM SAMPAI BERSIH! 🎺',
  'JANGAN MAIN REELS LAMA-LAMA YA BRO! ⏰',
  'NIKMAT LEGA SETELAH MEETING 3 JAM! 🧻',
  'TETAP TENANG SAAT PERUT BERGELAK! ⚡',
  'CUCI TANGAN BERSIH DENGAN SABUN! 🧼',
];

export function PoopMiniIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Persona Comic Mini Swirl */}
      <path
        d="M20 5C20 5 24 8.5 22.5 12C26 12.5 28.5 15.5 27.5 18.5C31 19.5 33 23 31.8 26.5C33.5 28.5 33 32 30 33.5C26.5 35 13.5 35 10 33.5C7 32 6.5 28.5 8.2 26.5C7 23 9 19.5 12.5 18.5C11.5 15.5 14 12.5 17.5 12C16 8.5 20 5 20 5Z"
        fill="#e60012"
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Phantom Mini Mask */}
      <path
        d="M12 21 C15 19 19 21 20 22 C21 21 25 19 28 21 C29 23 27 26 24 26 C21 26 20 23 16 26 C13 26 11 23 12 21 Z"
        fill="#000000"
      />
      <circle cx="16" cy="22.5" r="1.2" fill="#ffffff" />
      <circle cx="24" cy="22.5" r="1.2" fill="#ffffff" />
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
    ? { rotate: [-5, 5, -5], scale: [1, 1.08, 0.96, 1] }
    : isCalled
      ? { y: [0, -9, 0], scale: [1, 1.1, 1] }
      : isCepat
        ? { y: [0, -6, 0], x: [-3, 3, -3] }
        : isExhausted
          ? { y: [0, 2, 0], opacity: [0.85, 1, 0.85] }
          : { y: [0, -4, 0], rotate: [0, -2, 2, 0] };

  const bodyDuration = isNgeden
    ? 0.45
    : isCalled
      ? 0.6
      : isCepat
        ? 0.55
        : isExhausted
          ? 2.5
          : 2.0;

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

  const bodyColor = isMaintenance
    ? '#2e2e38'
    : isNgeden
      ? '#e60012'
      : isExhausted
        ? '#1e1e24'
        : isCalled
          ? '#e60012'
          : '#ffffff';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Persona 5 Comic Calling Card Speech Bubble */}
      <AnimatePresence>
        {activeQuote && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 min-w-[190px] max-w-[260px] pointer-events-none"
          >
            <div className="relative border-2 border-white bg-black p-3 text-xs font-black uppercase text-white shadow-[4px_4px_0px_#e60012] transform skew-x-[-4deg]">
              <p className="leading-snug text-center transform skew-x-[4deg]">{activeQuote}</p>
              {/* Bubble Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-black border-r-2 border-b-2 border-white rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Details */}
      {isNgeden && (
        <motion.span
          className="absolute -right-2 top-0 text-sm font-black text-[#e60012]"
          animate={{ y: [0, 6, 0], scale: [1, 1.25, 1] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
        >
          🔥
        </motion.span>
      )}

      {isExhausted && (
        <motion.span
          className="absolute -top-2 right-0 font-mono text-xs font-black text-slate-400"
          animate={{ y: [0, -6], opacity: [0.3, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        >
          ZZZ
        </motion.span>
      )}

      {isCalled && (
        <motion.span
          className="absolute -top-2 -right-1 text-sm font-black"
          animate={{ rotate: [-20, 20, -20], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          ✨
        </motion.span>
      )}

      <motion.button
        type="button"
        tabIndex={interactive ? 0 : -1}
        onClick={handleClick}
        title={interactive ? 'Klik Phantom Plop! 💩' : undefined}
        className={`w-full h-full p-0 bg-transparent border-0 flex items-center justify-center outline-none ${
          interactive
            ? 'cursor-pointer hover:brightness-110 active:scale-95 transition-all'
            : 'pointer-events-none'
        }`}
        whileHover={interactive ? { scale: 1.1, rotate: [-3, 3, 0] } : undefined}
        whileTap={interactive ? { scale: 0.88 } : undefined}
      >
        <motion.svg
          viewBox="0 0 64 64"
          fill="none"
          className="w-full h-full drop-shadow-[3px_3px_0px_#000000]"
          animate={
            clicked
              ? { scale: [1, 1.3, 0.85, 1.1, 1], rotate: [-10, 10, -5, 5, 0] }
              : bodyAnimate
          }
          transition={{
            duration: clicked ? 0.45 : bodyDuration,
            repeat: clicked ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Solid Comic Ground Shadow */}
          <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" />

          {/* Smooth Swirled Body with Thick Ink Border */}
          <path
            d="M32 7C32 7 38.5 12.5 36 18C42 18.8 45.8 23.5 44 28.5C50 30 53 35.5 51 41C54 44 53.5 49.5 48.5 52C43.5 54 20.5 54 15.5 52C10.5 49.5 10 44 13 41C11 35.5 14 30 20 28.5C18.2 23.5 22 18.8 28 18C25.5 12.5 32 7 32 7Z"
            fill={bodyColor}
            stroke="#000000"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Comic Ridge Lines */}
          <path
            d="M20 37C24.5 34.5 39.5 34.5 44 37"
            stroke="#000000"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M24 26C27.5 24.5 36.5 24.5 40 26"
            stroke="#000000"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Persona Phantom Thief Domino Mask */}
          <path
            d="M17 32C22 27 30 31 32 34C34 31 42 27 47 32C50 37 47 42 41 43C36 44 34 39 32 39C30 39 28 44 23 43C17 42 14 37 17 32Z"
            fill="#000000"
            stroke="#ffffff"
            strokeWidth="1.2"
          />

          {/* Expressive Mask Eyes */}
          {isNgeden ? (
            <>
              {/* Intense Flaming Slanted Eyes */}
              <polygon points="21,34 27,37 22,39" fill="#ffffff" />
              <polygon points="43,34 37,37 42,39" fill="#ffffff" />
              {/* Clenched Gritted Teeth Mouth */}
              <path
                d="M26 47L38 47"
                stroke="#000000"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M29 45V49M32 45V49M35 45V49"
                stroke="#000000"
                strokeWidth="1.8"
              />
            </>
          ) : isExhausted ? (
            <>
              {/* Swirly Knockout Eyes */}
              <circle cx="24" cy="35" r="2.8" stroke="#ffffff" strokeWidth="1.6" fill="none" />
              <circle cx="40" cy="35" r="2.8" stroke="#ffffff" strokeWidth="1.6" fill="none" />
              <circle cx="32" cy="46" r="2" fill="#000000" />
            </>
          ) : isMaintenance ? (
            <>
              {/* Serious Goggle Eyes */}
              <rect x="21" y="32" width="7" height="6" fill="#ffffff" rx="1.5" />
              <rect x="36" y="32" width="7" height="6" fill="#ffffff" rx="1.5" />
              <circle cx="24.5" cy="35" r="1.5" fill="#000000" />
              <circle cx="39.5" cy="35" r="1.5" fill="#000000" />
              <path d="M27 46H37" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Sharp Confident Phantom Eyes with Gleam */}
              <ellipse cx="24" cy="35" rx="3.5" ry="4.2" fill="#ffffff" />
              <ellipse cx="40" cy="35" rx="3.5" ry="4.2" fill="#ffffff" />
              <circle cx="24.5" cy="35.5" r="2" fill="#000000" />
              <circle cx="39.5" cy="35.5" r="2" fill="#000000" />
              {/* White Star Gleams */}
              <circle cx="23" cy="33.5" r="1" fill="#ffffff" />
              <circle cx="38" cy="33.5" r="1" fill="#ffffff" />

              {/* Bold Smirk */}
              <path
                d={
                  isCalled
                    ? 'M25 45C28 49 36 49 39 45'
                    : 'M26 45.5C29 48 35 48 38 45.5'
                }
                stroke="#000000"
                strokeWidth="2.5"
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
  { x: -55, y: -95, rot: 20, delay: 0.03, emoji: '🔥' },
  { x: -18, y: -80, rot: -15, delay: 0.01, emoji: '⚡' },
  { x: 24, y: -92, rot: 25, delay: 0.04, emoji: '✨' },
  { x: 68, y: -72, rot: -20, delay: 0.02, emoji: '🎯' },
  { x: 95, y: -45, rot: 32, delay: 0.05, emoji: '👑' },
  { x: -75, y: -30, rot: -35, delay: 0.06, emoji: '🌊' },
];

const BURST_LABELS: Record<PoopBurstKind, { text: string; icon: string }> = {
  occupy: {
    text: 'ALL-OUT IN! TIMER NGISING DIMULAI!',
    icon: '💩',
  },
  release: {
    text: 'MISSION COMPLETE! LEGA BANGET!',
    icon: '🌊',
  },
  queue: {
    text: 'TARGET ACQUIRED! ANTREAN DIAMANKAN!',
    icon: '⏳',
  },
  leave: {
    text: 'ANTREAN DIBATALKAN!',
    icon: '👋',
  },
  quota_full: {
    text: 'KUOTA 10/10 HABIS! ISTIRAHAT DULU!',
    icon: '🛑',
  },
};

export function PoopInteractionBurst({ event }: { event: PoopBurstEvent | null }) {
  const cfg = event ? BURST_LABELS[event.kind] : null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center justify-center lg:bottom-12 select-none"
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
              className="inline-flex items-center gap-2.5 border-2 border-white bg-[#e60012] px-6 py-3.5 text-sm font-black uppercase text-white shadow-[6px_6px_0px_#000000] transform skew-x-[-4deg]"
            >
              <span className="text-lg transform skew-x-[4deg]">{cfg.icon}</span>
              <span className="transform skew-x-[4deg] tracking-wider">{cfg.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
