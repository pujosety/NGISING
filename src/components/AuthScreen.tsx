import {
  AlertCircle,
  BookOpenCheck,
  Lock,
  LogIn,
  Tv,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import type { OfficeState } from '../shared/types.ts';

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
      return;
    }

    if (mode === 'guest') {
      if (guestName.trim().length < 2) {
        setLocalError('Nama tamu minimal 2 karakter.');
        return;
      }
      if (guestOrigin.trim().length < 2) {
        setLocalError('Asal instansi atau keperluan wajib diisi.');
        return;
      }
      await onGuestCheckIn({
        guestName: guestName.trim(),
        origin: guestOrigin.trim(),
      });
      return;
    }

    if (displayName.trim().length < 2) {
      setLocalError('Nama minimal 2 karakter.');
      return;
    }
    if (password.length < 4) {
      setLocalError('Password minimal 4 karakter.');
      return;
    }
    await onRegister({
      displayName: displayName.trim(),
      password,
    });
  };

  const activeError = localError || errorMessage;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      {/* Top right shortcut to TV mode */}
      {onOpenDisplay && (
        <div className="fixed top-4 right-4 z-10">
          <button
            type="button"
            onClick={onOpenDisplay}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 backdrop-blur-md hover:bg-slate-100 hover:text-slate-900 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Tv className="h-3.5 w-3.5 text-teal-600" />
            <span>Mode Layar TV</span>
          </button>
        </div>
      )}

      {/* Main Centered Card */}
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <img
            src="/app-logo.png"
            alt="Ngising Logo"
            className="mx-auto h-16 w-16 rounded-2xl object-contain shadow-md shadow-slate-200"
          />
          <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Ngising
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Pelacak Antrean Toilet Kantor Real-Time
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {/* Segmented Mode Toggle with Sliding Animation */}
          <div
            role="tablist"
            aria-label="Pilih mode akses"
            className="relative grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/90 p-1 text-xs font-bold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setLocalError(null);
                onClearError();
              }}
              className={`relative z-10 min-h-[38px] rounded-xl transition-colors text-center cursor-pointer select-none ${
                mode === 'login' ? 'text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mode === 'login' && (
                <motion.div
                  layoutId="auth-tab-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-white shadow-xs"
                />
              )}
              <span className="relative z-10">Masuk</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setLocalError(null);
                onClearError();
              }}
              className={`relative z-10 min-h-[38px] rounded-xl transition-colors text-center cursor-pointer select-none ${
                mode === 'register' ? 'text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mode === 'register' && (
                <motion.div
                  layoutId="auth-tab-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-white shadow-xs"
                />
              )}
              <span className="relative z-10">Daftar</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'guest'}
              onClick={() => {
                setMode('guest');
                setLocalError(null);
                onClearError();
              }}
              className={`relative z-10 min-h-[38px] rounded-xl transition-colors text-center cursor-pointer select-none ${
                mode === 'guest' ? 'text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {mode === 'guest' && (
                <motion.div
                  layoutId="auth-tab-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-white shadow-xs"
                />
              )}
              <span className="relative z-10">Tamu</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'guest' ? (
              <>
                <div>
                  <label htmlFor="guest-name" className="block text-xs font-bold text-slate-700">
                    Nama Anda
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Contoh: Budi"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
                <div>
                  <label htmlFor="guest-origin" className="block text-xs font-bold text-slate-700">
                    Asal / Keperluan
                  </label>
                  <input
                    id="guest-origin"
                    type="text"
                    value={guestOrigin}
                    onChange={(e) => setGuestOrigin(e.target.value)}
                    placeholder="Contoh: Tamu Meeting / Klien"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              </>
            ) : mode === 'register' ? (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-bold text-slate-700">
                    Nama Lengkap
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Siti Rahma"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-bold text-slate-700">
                    Buat Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="auth-identifier" className="block text-xs font-bold text-slate-700">
                    Nama atau Email
                  </label>
                  <input
                    id="auth-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: siti@kantor.id"
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>
                </div>
              </>
            )}

            {activeError && (
              <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{activeError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-700/20 hover:bg-teal-800 disabled:opacity-60 transition-all cursor-pointer active:scale-98"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Memproses...' : 'Masuk Sekarang'}</span>
                </>
              ) : mode === 'guest' ? (
                <>
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Menyimpan...' : 'Lanjut Sebagai Tamu'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Mendaftar...' : 'Daftar & Masuk'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials shortcut for testing */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
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
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
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
