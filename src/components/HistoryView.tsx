import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDuration, getPublicDisplayName } from '../shared/queueLogic.ts';
import type { HistoryEntry, NeedType } from '../shared/types.ts';

interface HistoryViewProps {
  history: HistoryEntry[];
  currentUserId: string;
}

function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryView({ history, currentUserId }: HistoryViewProps) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [needFilter, setNeedFilter] = useState<'all' | NeedType>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((item) => {
      if (scope === 'mine' && item.userId !== currentUserId) return false;
      if (needFilter !== 'all' && item.need !== needFilter) return false;
      if (!q) return true;
      const display =
        item.userId === currentUserId
          ? item.displayName
          : getPublicDisplayName(item.displayName, item.isAnonymous, item.userId);
      return (
        display.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
      );
    });
  }, [history, scope, currentUserId, searchQuery, needFilter]);

  const handleExportCsv = () => {
    const header = ['Waktu Mulai', 'Waktu Selesai', 'Karyawan', 'Divisi', 'Keperluan', 'Durasi'];
    const rows = filtered.map((item) => [
      new Date(item.startedAt).toISOString(),
      new Date(item.endedAt).toISOString(),
      item.userId === currentUserId
        ? item.displayName
        : getPublicDisplayName(item.displayName, item.isAnonymous, item.userId),
      item.department,
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
    link.download = `riwayat-ngising-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalSessions = filtered.length;
  const totalDurationMs = filtered.reduce((acc, curr) => acc + curr.durationMs, 0);

  return (
    <div className="space-y-6">
      {/* Header and Summary stats card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
            Riwayat Sesi
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#dbc08b]/80">
            Audit dan transparansi penggunaan bilik toilet secara real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="btn-3d-poop inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* KPI Highlight Cards in Glassmorphism */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card rounded-2xl p-4 border border-[#c99f57]/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dbc08b]/70 block">
            Total Sesi
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {totalSessions}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-[#c99f57]/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dbc08b]/70 block">
            Total Waktu
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {formatDuration(totalDurationMs)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-[#c99f57]/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dbc08b]/70 block">
            Rata-rata / Sesi
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {totalSessions > 0 ? formatDuration(Math.round(totalDurationMs / totalSessions)) : '0m'}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-[#c99f57]/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dbc08b]/70 block">
            Sesi Pup / Santai
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-[#dbc08b] tabular-nums">
            {filtered.filter((f) => f.need === 'pup').length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-[#c99f57]/25">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter cakupan riwayat"
            className="inline-flex items-center gap-1 rounded-xl bg-[#241407]/70 p-1 border border-[#c99f57]/20"
          >
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                scope === 'mine'
                  ? 'bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] text-white shadow-sm'
                  : 'text-[#dbc08b]/70 hover:text-white'
              }`}
            >
              Catatan Saya
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] text-white shadow-sm'
                  : 'text-[#dbc08b]/70 hover:text-white'
              }`}
            >
              Semua Karyawan
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter jenis keperluan"
            className="inline-flex items-center gap-1 rounded-xl bg-[#241407]/70 p-1 border border-[#c99f57]/20"
          >
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'pup', label: 'Pup 💩' },
                { id: 'cepat', label: 'Cepat ⚡' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNeedFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  needFilter === tab.id
                    ? 'bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] text-white shadow-sm'
                    : 'text-[#dbc08b]/70 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#dbc08b]"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Cari riwayat karyawan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau divisi..."
            className="w-full rounded-xl border border-[#c99f57]/30 bg-[#241407]/60 py-2 pl-10 pr-3.5 text-xs text-white placeholder:text-[#dbc08b]/40 focus:border-[#dbc08b] focus:outline-none focus:ring-2 focus:ring-[#ad7c2b]/30 shadow-inner"
          />
        </div>
      </div>

      {/* Glass Data Table */}
      <div className="glass-card overflow-hidden rounded-3xl border border-[#c99f57]/20">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-white">
              {scope === 'mine'
                ? 'Kamu belum memiliki catatan sesi yang cocok'
                : 'Tidak ada catatan yang cocok'}
            </p>
            <p className="mt-1 text-xs text-[#dbc08b]/70">
              Coba ubah filter atau gunakan bilik toilet dari dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#c99f57]/20 bg-[#241407]/60 text-xs font-bold text-[#dbc08b]">
                  <th className="px-4 py-3.5">Karyawan</th>
                  <th className="px-4 py-3.5">Keperluan</th>
                  <th className="px-4 py-3.5 text-right">Mulai</th>
                  <th className="px-4 py-3.5 text-right">Selesai</th>
                  <th className="px-4 py-3.5 text-right">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c99f57]/10">
                {filtered.map((item) => {
                  const isMe = item.userId === currentUserId;
                  const displayName = isMe
                    ? `${item.displayName} (Kamu)`
                    : getPublicDisplayName(item.displayName, item.isAnonymous, item.userId);
                  return (
                    <tr key={item.id} className="hover:bg-[#3e2610]/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-white">{displayName}</p>
                        {item.department ? (
                          <p className="text-xs text-[#dbc08b]/70">{item.department}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-bold ${
                            item.need === 'pup' ? 'text-[#dbc08b]' : 'text-teal-400'
                          }`}
                        >
                          {item.need === 'pup' ? '💩 Pup' : '⚡ Cepat'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-[#e8d9b5]/80">
                        {formatTimeOnly(item.startedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-[#e8d9b5]/80">
                        {formatTimeOnly(item.endedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-black tabular-nums text-white">
                        {formatDuration(item.durationMs)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
