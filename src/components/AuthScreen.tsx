import {
  AlertCircle,
  BookOpenCheck,
  Lock,
  LogIn,
  Tv,
  User,
  UserPlus,
  Flame,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import type { OfficeState } from '../shared/types.ts';
import { isAndroidOrNative } from '../utils/platform.ts';

interface AuthScreenProps {
  officeState: OfficeState | null;
  authLoading: boolean;
  errorMessage: string | null;
  isLocalFallback?: boolean;
  now: number;
  onClearError: () => void;
  onOpenDisplay?: () => void;
  onLogin: (identifier: string, password: string) => Promise<boolean>;
  onRegister: (params: {
    displayName: string;
    password: string;
  }) => Promise<boolean>;
  onGuestCheckIn: (params: {
    guestName: string;
    origin: string;
  }) => Promise<boolean>;
}

export function AuthScreen({
  officeState,
  authLoading,
  errorMessage,
  isLocalFallback = false,
  now,
  onClearError,
  onOpenDisplay,
  onLogin,
  onRegister,
  onGuestCheckIn,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestOrigin, setGuestOrigin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setLocalError('Nama/email dan password wajib diisi.');
        return;
      }
      await onLogin(identifier.trim(), password);
    } else if (mode === 'register') {
      if (!displayName.trim() || !password) {
        setLocalError('Nama lengkap dan password wajib diisi.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password minimal 6 karakter.');
        return;
      }
      await onRegister({
        displayName: displayName.trim(),
        password,
      });
    } else {
      if (!guestName.trim()) {
        setLocalError('Nama tamu wajib diisi.');
        return;
      }
      await onGuestCheckIn({
        guestName: guestName.trim(),
        origin: guestOrigin.trim() || 'Tamu Kantor',
      });
    }
  };

  const toilet = officeState?.toilet;
  const isOccupied = toilet?.status === 'occupied' && toilet.occupant !== null;
  const isMaintenance = toilet?.status === 'maintenance';
  const queueCount = officeState?.queue.length ?? 0;
  const activeError = localError || errorMessage;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#0c0c0e]">
      {/* Persona 5 Angular Dynamic Background Elements */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-96 w-[120vw] bg-[#e60012] opacity-20 -rotate-12 transform origin-top-left" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-[120vw] bg-[#e60012] opacity-15 -rotate-12 transform origin-bottom-right" />
      <div className="pointer-events-none absolute inset-0 p5-halftone-pattern opacity-10" />

      <div className="relative z-10 w-full max-w-md">
        {/* Top TV Monitor quick button (hidden on Android) */}
        {onOpenDisplay && !isAndroidOrNative() && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onOpenDisplay}
              className="p5-btn-black inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black cursor-pointer"
            >
              <Tv className="h-4 w-4 text-[#e60012]" />
              <span>BUKA LAYAR TV</span>
            </button>
          </div>
        )}

        {/* Main Persona 5 Calling Card Panel */}
        <div className="p5-card rounded-none p-6 sm:p-8 transform -rotate-1 sm:-rotate-2 border-2 border-white">
          {/* Header Title & Graphic Cut */}
          <div className="relative text-center">
            {/* Persona Mask / Mascot Plaque */}
            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="inline-flex h-20 w-20 items-center justify-center bg-[#e60012] border-2 border-white shadow-[4px_4px_0px_#000000] p-2 transform skew-x-[-6deg]"
            >
              <img
                src="/app-logo.png"
                alt="Ngising Mascot"
                className="h-16 w-16 object-contain transform skew-x-[6deg]"
              />
            </motion.div>

            <div className="mt-4 inline-block bg-black px-4 py-1 border-2 border-[#e60012] transform skew-x-[-8deg] shadow-[4px_4px_0px_#ffffff]">
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase transform skew-x-[8deg]">
                TAKE YOUR <span className="text-[#e60012]">TURN!</span>
              </h1>
            </div>

            <p className="mt-2 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">
              SISTEM ANTREAN BILIK TOILET KANTOR
            </p>

            {/* Live Status Calling Badge */}
            <div className="mt-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 font-mono text-xs font-black text-black transform skew-x-[-6deg] shadow-[3px_3px_0px_#e60012]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isMaintenance
                    ? 'bg-amber-500'
                    : isOccupied
                      ? 'bg-[#e60012] animate-ping'
                      : 'bg-emerald-500'
                }`}
              />
              <span className="transform skew-x-[6deg] tracking-tight">
                {isMaintenance
                  ? 'MAINTENANCE'
                  : isOccupied
                    ? 'SEDANG DIGUNAKAN'
                    : 'BILIK KOSONG'}
                {' · '}{queueCount} ANTRE
              </span>
            </div>
          </div>

          {/* Persona Style Angular Mode Switcher */}
          <div className="relative mt-6 flex gap-2">
            {(
              [
                { id: 'login', label: 'MASUK' },
                { id: 'register', label: 'DAFTAR' },
                { id: 'guest', label: 'TAMU' },
              ] as const
            ).map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setLocalError(null);
                    onClearError();
                  }}
                  className={`flex-1 py-2 text-xs font-black tracking-wider transition-all cursor-pointer transform skew-x-[-6deg] border-2 ${
                    active
                      ? 'bg-[#e60012] text-white border-white shadow-[3px_3px_0px_#000000]'
                      : 'bg-black text-slate-300 border-[#2e2e38] hover:border-white hover:text-white'
                  }`}
                >
                  <span className="inline-block transform skew-x-[6deg]">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'login' ? (
              <>
                <div>
                  <label
                    htmlFor="auth-identifier"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    NAMA / EMAIL KARYAWAN
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-[#e60012]" />
                    <input
                      id="auth-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="siti / siti@kantor.id"
                      className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 pl-10 pr-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#e60012]" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 pl-10 pr-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                    />
                  </div>
                </div>
              </>
            ) : mode === 'guest' ? (
              <>
                <div>
                  <label
                    htmlFor="guest-name"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    NAMA LENGKAP TAMU
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Contoh: Rian (Vendor IT)"
                    className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 px-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guest-origin"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    ASAL INSTANSI / TUJUAN
                  </label>
                  <input
                    id="guest-origin"
                    type="text"
                    value={guestOrigin}
                    onChange={(e) => setGuestOrigin(e.target.value)}
                    placeholder="Meeting, Klien, dll."
                    className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 px-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    NAMA PANGGILAN / LENGKAP
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 px-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-black uppercase tracking-wider text-white mb-1"
                  >
                    BUAT PASSWORD (MIN. 6 KARAKTER)
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 px-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
                  />
                </div>
              </>
            )}

            {activeError && (
              <div
                role="alert"
                className="flex items-center gap-2 border-2 border-black bg-[#e60012] p-3 text-xs font-black text-white shadow-[3px_3px_0px_#000000]"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            {/* Persona Action Command Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="p5-btn-red w-full min-h-[50px] py-3 px-4 text-sm font-black cursor-pointer disabled:opacity-50 mt-3"
            >
              <span className="flex items-center justify-center gap-2">
                {mode === 'login' ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>{authLoading ? 'MEMPROSES...' : 'ALL-OUT IN! (MASUK)'}</span>
                  </>
                ) : mode === 'guest' ? (
                  <>
                    <BookOpenCheck className="h-4 w-4" />
                    <span>{authLoading ? 'MENYIMPAN...' : 'LANJUT SEBAGAI TAMU'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>{authLoading ? 'MENDAFTARKAN...' : 'GABUNG PHANTOM SQUAD'}</span>
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
