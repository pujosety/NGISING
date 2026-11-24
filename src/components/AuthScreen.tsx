import {
  AlertCircle,
  BookOpenCheck,
  Lock,
  LogIn,
  Tv,
  User,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import type { OfficeState } from '../shared/types.ts';
import { isAndroidOrNative } from '../utils/platform.ts';
import { PoopMiniIcon } from './PoopAnimations.tsx';

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
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Dynamic 3D ambient orbs in brown & amber */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,#ad7c2b,transparent_70%)] opacity-30 blur-3xl animate-float-3d" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#6f4717,transparent_70%)] opacity-35 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Top TV Monitor quick button (hidden on Android/native) */}
        {onOpenDisplay && !isAndroidOrNative() && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onOpenDisplay}
              className="glass-pill inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold text-[#dbc08b] hover:text-white hover:border-[#c99f57] transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Tv className="h-3.5 w-3.5 text-[#c99f57]" />
              <span>Buka Layar Monitor TV</span>
            </button>
          </div>
        )}

        {/* Main 3D Glassmorphism Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 backdrop-blur-2xl">
          {/* Header with 3D Mascot */}
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c5d1d] to-[#3e2610] shadow-2xl border border-[#c99f57]/30 glow-poop p-2"
            >
              <img
                src="/app-logo.png"
                alt="Ngising Mascot"
                className="h-16 w-16 object-contain drop-shadow-md"
              />
            </motion.div>

            <h1 className="mt-4 font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ngising <span className="text-[#dbc08b]">Office</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#e8d9b5]/80">
              Antrean & Ketersediaan Bilik Toilet Cerdas
            </p>

            {/* Live Bilik status glass pill */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full glass-pill px-3.5 py-1.5 text-xs font-semibold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isMaintenance
                    ? 'bg-amber-400'
                    : isOccupied
                      ? 'bg-rose-500 animate-pulse'
                      : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-[#f5eedb]">
                {isMaintenance
                  ? 'Bilik Sedang Maintenance'
                  : isOccupied
                    ? 'Bilik Sedang Digunakan'
                    : 'Bilik Sedang Kosong'}
              </span>
              <span className="text-[#dbc08b]/50">·</span>
              <span className="text-[#dbc08b] font-mono">{queueCount} antre</span>
            </div>
          </div>

          {/* Sliding Glass Mode Switcher */}
          <div className="relative mt-6 flex rounded-2xl bg-[#241407]/70 p-1.5 border border-[#c99f57]/20 shadow-inner">
            {(
              [
                { id: 'login', label: 'Masuk' },
                { id: 'register', label: 'Daftar' },
                { id: 'guest', label: 'Tamu' },
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
                  className={`relative flex-1 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer text-center z-10 ${
                    active ? 'text-white' : 'text-[#dbc08b]/70 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="auth-tab-pill-glass"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] shadow-md border border-[#c99f57]/50"
                    />
                  )}
                  <span className="relative z-20">{tab.label}</span>
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
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Nama atau Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-[#dbc08b]" />
                    <input
                      id="auth-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="siti / siti@kantor.id"
                      className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#dbc08b]" />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                    />
                  </div>
                </div>
              </>
            ) : mode === 'guest' ? (
              <>
                <div>
                  <label
                    htmlFor="guest-name"
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Nama Lengkap Tamu
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Contoh: Rian (Vendor IT)"
                    className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 px-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guest-origin"
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Asal / Keperluan (Opsional)
                  </label>
                  <input
                    id="guest-origin"
                    type="text"
                    value={guestOrigin}
                    onChange={(e) => setGuestOrigin(e.target.value)}
                    placeholder="Meeting, Tamu Klien, dll."
                    className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 px-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Nama Panggilan / Lengkap
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 px-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
                  >
                    Buat Password (min. 6 karakter)
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 px-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
                  />
                </div>
              </>
            )}

            {activeError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-rose-950/60 p-3 text-xs font-semibold text-rose-200 border border-rose-500/40"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{activeError}</span>
              </motion.div>
            )}

            {/* 3D Poop Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="btn-3d-poop w-full min-h-[48px] rounded-xl py-3 px-4 text-sm font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{authLoading ? 'Memproses...' : 'Masuk Sekarang'}</span>
                </>
              ) : mode === 'guest' ? (
                <>
                  <BookOpenCheck className="h-4 w-4" />
                  <span>{authLoading ? 'Menyimpan...' : 'Lanjut Sebagai Tamu'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{authLoading ? 'Mendaftarkan...' : 'Daftar & Masuk'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons (Clean 3D Pill Style) */}
          <div className="mt-6 border-t border-[#c99f57]/20 pt-4 text-center">
            <span className="text-[11px] font-bold text-[#dbc08b]/70 block mb-2.5">
              Akun Cepat (Klik untuk isi otomatis):
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setIdentifier('siti@kantor.id');
                  setPassword('ngising123');
                }}
                className="glass-pill rounded-lg px-2.5 py-1 text-xs font-bold text-[#dbc08b] hover:text-white hover:border-[#c99f57] transition-all cursor-pointer"
              >
                👑 Siti (Admin)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setIdentifier('budi@kantor.id');
                  setPassword('ngising123');
                }}
                className="glass-pill rounded-lg px-2.5 py-1 text-xs font-bold text-[#dbc08b] hover:text-white hover:border-[#c99f57] transition-all cursor-pointer"
              >
                👤 Budi
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('guest');
                  setGuestName('Tamu Kantor');
                  setGuestOrigin('Meeting');
                }}
                className="glass-pill rounded-lg px-2.5 py-1 text-xs font-bold text-[#dbc08b] hover:text-white hover:border-[#c99f57] transition-all cursor-pointer"
              >
                🏢 Mode Tamu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
