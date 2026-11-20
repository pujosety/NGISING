import { Check, EyeOff, LogOut, RotateCcw, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Stall, UserAccount } from '../shared/types.ts';

interface SettingsViewProps {
  user: UserAccount;
  toilet: Stall;
  busy: boolean;
  onUpdateProfile: (params: {
    displayName: string;
    department: string;
    isAnonymous: boolean;
  }) => Promise<boolean>;
  onToggleMaintenance: () => Promise<boolean>;
  onResetDemo: () => Promise<boolean>;
  onLogout: () => void;
}

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Marketing',
  'People & HR',
  'Finance',
  'Umum',
];

export function SettingsView({
  user,
  toilet,
  busy,
  onUpdateProfile,
  onToggleMaintenance,
  onResetDemo,
  onLogout,
}: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [department, setDepartment] = useState(user.department);
  const [isAnonymous, setIsAnonymous] = useState(user.isAnonymous);
  const [savedNotice, setSavedNotice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const isOccupied = toilet.status === 'occupied';
  const isMaint = toilet.status === 'maintenance';

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setFormError('Nama karyawan minimal 2 karakter.');
      return;
    }
    setFormError(null);
    const ok = await onUpdateProfile({
      displayName: displayName.trim(),
      department,
      isAnonymous,
    });
    if (ok) {
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Akun Pribadi & Kontrol Toilet
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Kelola profil akunmu dan status operasional satu-satunya toilet kantor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Personal Account Form */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-bold text-slate-900">
            Profil Akun Saya
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            <div>
              <label htmlFor="acc-name" className="block text-xs font-medium text-slate-700">
                Nama Tampilan
              </label>
              <input
                id="acc-name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setFormError(null);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            <div>
              <label htmlFor="acc-dept" className="block text-xs font-medium text-slate-700">
                Divisi / Tim
              </label>
              <select
                id="acc-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Mode Samaran (Anonim)
                </span>
                Di papan publik tampil sebagai kode samaran, sementara di dashboard pribadimu tetap tercatat lengkap.
              </span>
            </label>

            {formError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{savedNotice ? 'Tersimpan!' : 'Simpan Profil'}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </form>
        </section>

        {/* Single Toilet Operations */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Operasional {toilet.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {toilet.location} <span aria-hidden="true">·</span> Status saat ini:{' '}
              <span className="font-semibold text-slate-700">
                {isOccupied
                  ? 'Sedang Terisi'
                  : isMaint
                    ? 'Dalam Perawatan'
                    : 'Tersedia'}
              </span>
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Mode Perawatan</p>
              <p className="text-xs text-slate-500">
                Tandai toilet tidak tersedia sementara saat sedang dibersihkan atau diperbaiki.
              </p>
            </div>
            <button
              type="button"
              disabled={busy || isOccupied}
              onClick={onToggleMaintenance}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                isMaint
                  ? 'border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isMaint ? 'Aktifkan Toilet' : 'Aktifkan Perawatan'}</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Reset Data Demo</p>
              <p className="text-xs text-slate-500">
                Kembalikan status antrean dan log toilet ke kondisi demo awal.
              </p>
            </div>

            {!confirmReset ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmReset(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Reset Data Demo</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setConfirmReset(false);
                    await onResetDemo();
                  }}
                  className="min-h-[38px] rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
