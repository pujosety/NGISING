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
      department: '',
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
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">
          PENGATURAN // AKUN SAYA
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-400 uppercase">
          Kelola nama panggilan dan privasi akun Phantom Ngising.
        </p>
      </div>

      <section className="p5-card p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-4">
          <div>
            <h3 className="font-display text-lg font-black uppercase text-white">
              PROFIL SAYA
            </h3>
            <p className="mt-0.5 text-xs font-bold text-slate-400 uppercase">
              Peran: <span className="text-[#e60012] font-black">{user.role === 'admin' ? '👑 ADMIN KANTOR' : 'KARYAWAN'}</span>
            </p>
          </div>
          {user.role === 'admin' && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="p5-btn-white inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>BUKA ADMIN PANEL</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="block text-xs font-black uppercase tracking-wider text-white mb-1.5"
            >
              NAMA TAMPILAN DI ANTREAN
            </label>
            <input
              id="settings-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[46px] border-2 border-white bg-black py-2.5 px-3.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
            />
          </div>

          <label className="flex items-start gap-3 border-2 border-black bg-black p-4 cursor-pointer shadow-[3px_3px_0px_#000000]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#e60012]"
            />
            <div className="text-xs">
              <span className="font-black uppercase text-white flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5 text-[#e60012]" />
                <span>MODE ANONIM (SAMARKAN NAMA)</span>
              </span>
              <p className="mt-1 text-slate-400 font-bold">
                Nama kamu akan disamarkan sebagai &quot;Karyawan&quot; di daftar antrean dan layar TV publik.
              </p>
            </div>
          </label>

          {formError && (
            <p className="text-xs font-black uppercase text-white bg-[#e60012] p-3 border-2 border-black shadow-[3px_3px_0px_#000000]">
              {formError}
            </p>
          )}

          {savedNotice && (
            <p className="flex items-center gap-1.5 text-xs font-black uppercase text-black bg-white p-3 border-2 border-black shadow-[3px_3px_0px_#e60012]">
              <Check className="h-4 w-4 text-[#e60012]" />
              <span>PROFIL BERHASIL DISIMPAN!</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <button
              type="submit"
              disabled={busy}
              className="p5-btn-red inline-flex min-h-[46px] items-center justify-center px-5 py-2.5 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
            >
              SIMPAN PERUBAHAN
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p5-btn-black inline-flex min-h-[46px] items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase text-white hover:text-[#ff4d4d] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>LOGOUT / KELUAR</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
