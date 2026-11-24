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
        <h2 className="font-display text-2xl font-black text-white">
          Akun Saya
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-[#dbc08b]/80">
          Kelola nama tampilan dan privasi akun Ngising milikmu.
        </p>
      </div>

      <section className="glass-card rounded-3xl p-6 sm:p-7 border border-[#c99f57]/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Profil Akun Saya
            </h3>
            <p className="mt-0.5 text-xs text-[#dbc08b]/80">
              Peran: <span className="font-bold text-white">{user.role === 'admin' ? '👑 Admin Kantor' : 'Karyawan'}</span>
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
              className="glass-pill inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[#dbc08b] hover:text-white cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buka Admin Panel</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="block text-xs font-bold text-[#e8d9b5] mb-1.5"
            >
              Nama Tampilan di Antrean
            </label>
            <input
              id="settings-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2.5 px-3.5 text-sm text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[#c99f57]/20 bg-[#241407]/40 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#ad7c2b]"
            />
            <div className="text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5 text-[#dbc08b]" />
                <span>Mode Anonim (Samarkan Nama)</span>
              </span>
              <p className="mt-1 text-[#dbc08b]/70">
                Nama kamu akan disamarkan sebagai &quot;Karyawan&quot; di daftar antrean dan layar TV publik.
              </p>
            </div>
          </label>

          {formError && (
            <p className="text-xs font-bold text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/40">
              {formError}
            </p>
          )}

          {savedNotice && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40">
              <Check className="h-4 w-4" />
              <span>Profil berhasil disimpan!</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-3d-poop inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-xs font-black text-white cursor-pointer disabled:opacity-50"
            >
              Simpan Perubahan
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="glass-pill inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-[#dbc08b] hover:bg-rose-950/60 hover:text-rose-200 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
