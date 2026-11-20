import { AlertCircle, CheckCircle2, Clock, Lock, LogIn, UserPlus, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { DemoAccountInfo } from '../hooks/useOfficeQueue.ts';
import { formatDuration, getPublicDisplayName } from '../shared/queueLogic.ts';
import type { OfficeState } from '../shared/types.ts';

interface AuthScreenProps {
  officeState: OfficeState | null;
  demoAccounts: DemoAccountInfo[];
  authLoading: boolean;
  errorMessage: string | null;
  now: number;
  onClearError: () => void;
  onLogin: (identifier: string, password: string) => Promise<boolean>;
  onRegister: (params: {
    displayName: string;
    password: string;
  }) => Promise<boolean>;
}

export function AuthScreen({
  officeState,
  demoAccounts,
  authLoading,
  errorMessage,
  now,
  onClearError,
  onLogin,
  onRegister,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
            Ngising
          </span>
          <span className="text-xs font-medium text-slate-500">
            Pantau & Antre Toilet Kantor Real-Time
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
              Masuk ke akunmu untuk melihat status toilet secara langsung, ambil nomor antrean otomatis, dan pantau statistik kebiasaanmu di dashboard pribadi.
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

              <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
                {isOccupied && toilet.occupant ? (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
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
                    <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">
                      {formatDuration(elapsedMs)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700">
                      {isMaintenance ? 'Sedang dibersihkan' : 'Toilet sedang kosong'}
                    </p>
                    <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
                      00:00
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Login / Register Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 lg:col-span-6">
          <div
            role="tablist"
            aria-label="Pilih mode akses akun"
            className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
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
              className={`min-h-[38px] rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
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
              className={`min-h-[38px] rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Mendaftar...' : 'Buat Akun Ngising'}</span>
                </>
              )}
            </button>
          </form>

          {demoAccounts.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium text-slate-500">
                Masuk cepat menggunakan akun demo (password: <code className="font-mono text-slate-700">ngising123</code>):
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={authLoading}
                    onClick={() => onLogin(acc.displayName, 'ngising123')}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      acc.role === 'admin'
                        ? 'border-teal-200 bg-teal-50/60 hover:bg-teal-50'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {acc.displayName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {acc.role === 'admin' ? 'Admin Panel' : acc.department || 'Karyawan'}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-700 shrink-0 ml-2">
                      Masuk
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
