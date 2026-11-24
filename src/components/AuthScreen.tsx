import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Lock,
  LogIn,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatDuration, getPublicDisplayName } from '../shared/queueLogic.ts';
import type { OfficeState } from '../shared/types.ts';
import { PoopMascot, PoopMiniIcon } from './PoopAnimations.tsx';

interface AuthScreenProps {
  officeState: OfficeState | null;
  authLoading: boolean;
  errorMessage: string | null;
  isLocalFallback?: boolean;
  now: number;
  onClearError: () => void;
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

  const toilet = officeState?.toilet ?? null;
  const isOccupied = toilet?.status === 'occupied' && toilet.occupant !== null;
  const isMaintenance = toilet?.status === 'maintenance';
  const elapsedMs =
    isOccupied && toilet?.occupant ? Math.max(0, now - toilet.occupant.startedAt) : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setLocalError('Nama dan password wajib diisi.');
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
        setLocalError('Asal instansi atau tujuan kunjungan wajib diisi.');
        return;
      }
      await onGuestCheckIn({
        guestName: guestName.trim(),
        origin: guestOrigin.trim(),
      });
      return;
    }

    if (displayName.trim().length < 2) {
      setLocalError('Nama karyawan minimal 2 karakter.');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3.5 pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/app-logo.png" alt="Ngising Logo" className="h-9 w-9 rounded-xl object-contain shadow-xs" />
            <div>
              <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                Ngising
              </span>
              <span className="text-[10px] font-medium text-slate-500 hidden sm:block">
                Pelacak Antrean Toilet Kantor
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Real-Time Monitor
          </span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:items-center">
        {/* Left Editorial Summary & Live 1-Toilet Preview */}
        <section className="space-y-6 lg:col-span-6">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-balance">
              Satu toilet kantor, antrean tertib tanpa bolak-balik ngecek.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Karyawan bisa masuk ke dashboard pribadi untuk memantau status toilet, sementara tamu atau customer cukup mengisi Buku Tamu tanpa perlu membuat akun.
            </p>
          </div>

          {toilet && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Status Saat Ini</p>
                  <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                    {toilet.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {toilet.location} <span aria-hidden="true">·</span>{' '}
                    {officeState?.queue.length ?? 0} orang dalam antrean
                  </p>
                </div>

                {isMaintenance ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    <span>Perawatan</span>
                  </span>
                ) : isOccupied ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>Terisi</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Tersedia</span>
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                {isOccupied && toilet.occupant ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <PoopMascot
                        mood={toilet.occupant.need === 'pup' ? 'ngeden' : 'cepat'}
                        size={42}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getPublicDisplayName(
                            toilet.occupant.displayName,
                            toilet.occupant.isAnonymous,
                            toilet.occupant.userId
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {toilet.occupant.department ? (
                            <>
                              {toilet.occupant.department} <span aria-hidden="true">·</span>{' '}
                            </>
                          ) : null}
                          {toilet.occupant.need === 'pup' ? 'Pup' : 'Cepat'}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 shrink-0">
                      {formatDuration(elapsedMs)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <PoopMascot mood={isMaintenance ? 'maintenance' : 'ready'} size={42} />
                      <p className="text-sm font-medium text-slate-700">
                        {isMaintenance ? 'Sedang dibersihkan' : 'Toilet sedang kosong'}
                      </p>
                    </div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700 shrink-0">
                      00:00
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Login / Register / Guestbook Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 lg:col-span-6">
          <div
            role="tablist"
            aria-label="Pilih mode akses akun"
            className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
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
              className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk Akun
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
              className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Baru
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
              className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                mode === 'guest'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buku Tamu
            </button>
          </div>

          {isLocalFallback && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
              Hosting statis terdeteksi tanpa server backend aktif. Aplikasi berjalan dengan penyimpanan browser lokal (data tersimpan di perangkat ini).
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'guest' ? (
              <>
                <p className="text-xs leading-relaxed text-slate-600">
                  Tamu atau customer tidak perlu membuat akun, cukup isi Buku Tamu sebelum memakai atau mengantre toilet.
                </p>
                <div>
                  <label htmlFor="guest-name" className="block text-xs font-medium text-slate-700">
                    Nama Tamu
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
                <div>
                  <label htmlFor="guest-origin" className="block text-xs font-medium text-slate-700">
                    Asal Instansi / Tujuan Kunjungan
                  </label>
                  <input
                    id="guest-origin"
                    type="text"
                    value={guestOrigin}
                    onChange={(e) => setGuestOrigin(e.target.value)}
                    placeholder="Contoh: PT Maju Jaya / Meeting"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              </>
            ) : (
              <>
                {mode === 'register' ? (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700">
                      Nama
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Contoh: Rina Wijaya"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="auth-identifier" className="block text-xs font-medium text-slate-700">
                      Nama atau Email
                    </label>
                    <input
                      id="auth-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: Siti Rahma"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
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
                      placeholder="Minimal 4 karakter"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    />
                  </div>
                </div>
              </>
            )}

            {activeError && (
              <p role="alert" className="flex items-center gap-2 text-xs font-medium text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{activeError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Memproses...' : 'Masuk ke Dashboard Saya'}</span>
                </>
              ) : mode === 'guest' ? (
                <>
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Menyimpan...' : 'Isi Buku Tamu & Lanjut'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Mendaftar...' : 'Buat Akun Ngising'}</span>
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
