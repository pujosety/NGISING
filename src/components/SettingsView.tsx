import { Check, EyeOff, LogOut, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { UserAccount } from '../shared/types.ts';

interface SettingsViewProps {
  user: UserAccount;
  busy: boolean;
  onUpdateProfile: (params: {
    displayName: string;
    department: string;
    isAnonymous: boolean;
  }) => Promise<boolean>;
  onOpenAdminPanel?: () => void;
  onLogout: () => void;
}

export function SettingsView({
  user,
  busy,
  onUpdateProfile,
  onOpenAdminPanel,
  onLogout,
}: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isAnonymous, setIsAnonymous] = useState(user.isAnonymous);
  const [savedNotice, setSavedNotice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setFormError('Nama karyawan minimal 2 karakter.');
      return;
    }
    setFormError(null);
    const ok = await onUpdateProfile({
      displayName: displayName.trim(),
      department: user.department,
      isAnonymous,
    });
    if (ok) {
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Akun Saya
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Kelola nama tampilan dan privasi akun Ngising milikmu.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Profil Akun Saya
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Peran: <span className="font-semibold text-slate-700">{user.role === 'admin' ? 'Admin Kantor' : 'Karyawan'}</span>
              {user.department ? (
                <>
                  {' '}<span aria-hidden="true">·</span> {user.department}
                </>
              ) : null}
            </p>
          </div>
          {user.role === 'admin' && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buka Admin Panel</span>
            </button>
          )}
        </div>

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
    </div>
  );
}
