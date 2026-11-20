import {
  ArrowUpToLine,
  Check,
  Download,
  KeyRound,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserMinus,
  Wrench,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { AdminUserSummary } from '../hooks/useOfficeQueue.ts';
import { formatDuration } from '../shared/queueLogic.ts';
import type { GuestbookEntry, OfficeState, UserRole } from '../shared/types.ts';

interface AdminPanelViewProps {
  officeState: OfficeState;
  currentUserId: string;
  users: AdminUserSummary[];
  guestbook: GuestbookEntry[];
  now: number;
  busy: boolean;
  onUpdateToilet: (name: string, location: string) => Promise<boolean>;
  onToggleMaintenance: () => Promise<boolean>;
  onForceRelease: () => Promise<boolean>;
  onPrioritizeQueue: (queueId: string) => Promise<boolean>;
  onRemoveQueue: (queueId: string) => Promise<boolean>;
  onClearQueue: () => Promise<boolean>;
  onUpdateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
  onResetUserPassword: (userId: string) => Promise<string | null>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  onDeleteHistory: (historyId: string) => Promise<boolean>;
  onDeleteGuestbook: (entryId: string) => Promise<boolean>;
  onResetDemo: () => Promise<boolean>;
}

function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminPanelView({
  officeState,
  currentUserId,
  users,
  guestbook,
  now,
  busy,
  onUpdateToilet,
  onToggleMaintenance,
  onForceRelease,
  onPrioritizeQueue,
  onRemoveQueue,
  onClearQueue,
  onUpdateUserRole,
  onResetUserPassword,
  onDeleteUser,
  onDeleteHistory,
  onDeleteGuestbook,
  onResetDemo,
}: AdminPanelViewProps) {
  const { toilet, queue, history } = officeState;

  const [toiletName, setToiletName] = useState(toilet.name);
  const [toiletLocation, setToiletLocation] = useState(toilet.location);
  const [toiletSaved, setToiletSaved] = useState(false);

  const [confirmForceRelease, setConfirmForceRelease] = useState(false);
  const [confirmClearQueue, setConfirmClearQueue] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmResetDemo, setConfirmResetDemo] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isOccupied = toilet.status === 'occupied' && toilet.occupant !== null;
  const isMaintenance = toilet.status === 'maintenance';

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const handleSaveToilet = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await onUpdateToilet(toiletName, toiletLocation);
    if (ok) {
      setToiletSaved(true);
      window.setTimeout(() => setToiletSaved(false), 2500);
    }
  };

  const handleExportAllCsv = () => {
    const header = ['Waktu Mulai', 'Waktu Selesai', 'Karyawan', 'Keperluan', 'Durasi'];
    const rows = history.map((item) => [
      new Date(item.startedAt).toISOString(),
      new Date(item.endedAt).toISOString(),
      item.displayName,
      item.need === 'pup' ? 'Pup' : 'Cepat',
      formatDuration(item.durationMs),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-ngising-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportGuestbookCsv = () => {
    const header = ['Waktu Kunjungan', 'Nama Tamu', 'Asal Instansi / Tujuan'];
    const rows = guestbook.map((item) => [
      new Date(item.visitedAt).toISOString(),
      item.guestName,
      item.origin,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buku-tamu-ngising-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  let statusText = 'Tersedia';
  let statusColor = 'text-emerald-700';
  if (isMaintenance) {
    statusText = 'Perawatan';
    statusColor = 'text-slate-600';
  } else if (isOccupied) {
    statusText = 'Terisi';
    statusColor = 'text-amber-700';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
            Admin Panel Kantor
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Kendali penuh operasional toilet, moderasi antrean live, akun karyawan, dan log audit.
          </p>
        </div>
      </div>

      {noticeMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
        >
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-xs font-semibold text-teal-800 hover:underline whitespace-nowrap"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 4-Column Admin KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Status Toilet</p>
          <p className={`mt-1.5 font-display text-xl font-bold ${statusColor}`}>
            {statusText}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Antrean Aktif</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {queue.length}
            <span className="ml-1 text-sm font-normal text-slate-500">orang</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Total Akun Terdaftar</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {users.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Sesi Tercatat</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {history.length}
          </p>
        </div>
      </div>

      {/* Section 1 & 2: Toilet Control + Live Queue Moderation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <section
          aria-labelledby="admin-toilet-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-6"
        >
          <div>
            <h3 id="admin-toilet-heading" className="font-display text-base font-bold text-slate-900">
              Kendali Toilet Kantor
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Ubah identitas toilet, aktifkan mode perawatan, atau kosongkan paksa bila penghuni lupa klik keluar.
            </p>
          </div>

          <form onSubmit={handleSaveToilet} className="space-y-3 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="admin-toilet-name" className="block text-xs font-medium text-slate-700">
                  Nama Toilet
                </label>
                <input
                  id="admin-toilet-name"
                  type="text"
                  value={toiletName}
                  onChange={(e) => setToiletName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
              <div>
                <label htmlFor="admin-toilet-loc" className="block text-xs font-medium text-slate-700">
                  Lokasi
                </label>
                <input
                  id="admin-toilet-loc"
                  type="text"
                  value={toiletLocation}
                  onChange={(e) => setToiletLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{toiletSaved ? 'Info Toilet Tersimpan' : 'Simpan Info Toilet'}</span>
            </button>
          </form>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Mode Perawatan</p>
              <p className="text-xs text-slate-500">
                Nonaktifkan toilet sementara saat pembersihan atau perbaikan.
              </p>
            </div>
            <button
              type="button"
              disabled={busy || isOccupied}
              onClick={onToggleMaintenance}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                isMaintenance
                  ? 'border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isMaintenance ? 'Aktifkan Toilet' : 'Aktifkan Perawatan'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Paksa Kosongkan Toilet</p>
              <p className="text-xs text-slate-500">
                {isOccupied && toilet.occupant
                  ? `Saat ini dipakai ${toilet.occupant.displayName} (${formatDuration(Math.max(0, now - toilet.occupant.startedAt))}).`
                  : 'Toilet sedang tidak terisi.'}
              </p>
            </div>

            {!confirmForceRelease ? (
              <button
                type="button"
                disabled={busy || !isOccupied}
                onClick={() => setConfirmForceRelease(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Paksa Kosongkan</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setConfirmForceRelease(false);
                    await onForceRelease();
                  }}
                  className="min-h-[36px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Konfirmasi
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmForceRelease(false)}
                  className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Queue Moderation */}
        <section
          aria-labelledby="admin-queue-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="admin-queue-heading" className="font-display text-base font-bold text-slate-900">
                Moderasi Antrean Live
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Prioritaskan kebutuhan mendesak ke posisi #1 atau keluarkan antrean yang tidak aktif.
              </p>
            </div>

            {queue.length > 0 &&
              (!confirmClearQueue ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmClearQueue(true)}
                  className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Kosongkan Antrean
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setConfirmClearQueue(false);
                      await onClearQueue();
                    }}
                    className="min-h-[36px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Ya, Kosongkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearQueue(false)}
                    className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                </div>
              ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            {queue.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Tidak ada karyawan dalam antrean saat ini.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {queue.map((entry, idx) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold tabular-nums text-slate-500 w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {entry.displayName}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {entry.need === 'pup' ? 'Pup' : 'Cepat'}{' '}
                          <span aria-hidden="true">·</span>{' '}
                          {entry.status === 'called'
                            ? 'Sedang dipanggil'
                            : `Menunggu ${formatDuration(Math.max(0, now - entry.joinedAt))}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {idx > 0 && entry.status === 'waiting' && (
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Majukan ${entry.displayName} ke antrean #1`}
                          onClick={() => onPrioritizeQueue(entry.id)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                          <ArrowUpToLine className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Majukan #1</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Keluarkan ${entry.displayName} dari antrean`}
                        onClick={() => onRemoveQueue(entry.id)}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Keluarkan</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {/* Section 3: User Account Management */}
      <section
        aria-labelledby="admin-users-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="admin-users-heading" className="font-display text-base font-bold text-slate-900">
              Manajemen Akun Karyawan
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Atur peran Admin/Karyawan, reset password akun, atau hapus akun yang sudah keluar.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari akun karyawan"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari nama karyawan..."
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Tidak ada akun karyawan yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Peran</th>
                  <th className="px-5 py-3 text-right">Total Sesi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((account) => {
                  const isSelf = account.id === currentUserId;
                  const nextRole: UserRole = account.role === 'admin' ? 'employee' : 'admin';
                  return (
                    <tr key={account.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">
                          {account.displayName}
                          {isSelf ? ' (Kamu)' : ''}
                        </p>
                        {account.department && (
                          <p className="text-xs text-slate-500">{account.department}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            account.role === 'admin' ? 'text-teal-700' : 'text-slate-600'
                          }`}
                        >
                          {account.role === 'admin' ? 'Admin' : 'Karyawan'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                        {account.sessionCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy || isSelf}
                            aria-label={`Ubah peran ${account.displayName} menjadi ${nextRole === 'admin' ? 'Admin' : 'Karyawan'}`}
                            onClick={() => onUpdateUserRole(account.id, nextRole)}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            <Shield className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            <span>
                              {account.role === 'admin' ? 'Jadikan Karyawan' : 'Jadikan Admin'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Reset sandi ${account.displayName}`}
                            onClick={async () => {
                              const msg = await onResetUserPassword(account.id);
                              if (msg) setNoticeMessage(msg);
                            }}
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            <span>Reset Sandi</span>
                          </button>

                          {!isSelf &&
                            (confirmDeleteUserId === account.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  aria-label={`Konfirmasi hapus ${account.displayName}`}
                                  onClick={async () => {
                                    setConfirmDeleteUserId(null);
                                    await onDeleteUser(account.id);
                                  }}
                                  className="min-h-[32px] rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="min-h-[32px] rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Hapus akun ${account.displayName}`}
                                onClick={() => setConfirmDeleteUserId(account.id)}
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Hapus</span>
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 4: Audit Log & Data Management */}
      <section
        aria-labelledby="admin-audit-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="admin-audit-heading" className="font-display text-base font-bold text-slate-900">
              Log Audit & Data Kantor
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Hapus catatan yang keliru, ekspor CSV lengkap, atau reset data demo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportAllCsv}
              disabled={history.length === 0}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Ekspor CSV Lengkap</span>
            </button>

            {!confirmResetDemo ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmResetDemo(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Data Demo</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setConfirmResetDemo(false);
                    await onResetDemo();
                  }}
                  className="min-h-[38px] rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Ya, Reset Demo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetDemo(false)}
                  className="min-h-[38px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Belum ada catatan riwayat penggunaan toilet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Karyawan (Nama Asli)</th>
                  <th className="px-5 py-3">Keperluan</th>
                  <th className="px-5 py-3 text-right">Mulai</th>
                  <th className="px-5 py-3 text-right">Durasi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {item.displayName}
                      {item.isAnonymous ? (
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          (Mode Samaran)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          item.need === 'pup' ? 'text-amber-700' : 'text-teal-700'
                        }`}
                      >
                        {item.need === 'pup' ? 'Pup' : 'Cepat'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                      {formatTimeOnly(item.startedAt)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                      {formatDuration(item.durationMs)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Hapus log sesi ${item.displayName}`}
                        onClick={() => onDeleteHistory(item.id)}
                        className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 5: Buku Tamu Kantor */}
      <section
        aria-labelledby="admin-guestbook-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 id="admin-guestbook-heading" className="font-display text-base font-bold text-slate-900">
              Buku Tamu Kantor ({guestbook.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Catatan tamu dan customer yang mengisi buku tamu sebelum memakai toilet kantor.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportGuestbookCsv}
            disabled={guestbook.length === 0}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Ekspor CSV Buku Tamu</span>
          </button>
        </div>

        {guestbook.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Belum ada catatan kunjungan tamu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Nama Tamu</th>
                  <th className="px-5 py-3">Asal Instansi / Tujuan</th>
                  <th className="px-5 py-3 text-right">Waktu Kunjungan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guestbook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {entry.guestName}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {entry.origin}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                      {formatDateTime(entry.visitedAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Hapus buku tamu ${entry.guestName}`}
                        onClick={() => onDeleteGuestbook(entry.id)}
                        className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
