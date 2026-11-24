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
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            RIWAYAT SESI // LOG AUDIT
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-400 uppercase">
            Transparansi dan audit bilik toilet tanpa manipulasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="p5-btn-red inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>EKSPOR DATA CSV</span>
        </button>
      </div>

      {/* KPI Highlight Cards in Persona 5 High Contrast */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="p5-card p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            TOTAL SESI
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {totalSessions}
          </p>
        </div>
        <div className="p5-card p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            TOTAL WAKTU
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {formatDuration(totalDurationMs)}
          </p>
        </div>
        <div className="p5-card p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            RATA-RATA / SESI
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {totalSessions > 0 ? formatDuration(Math.round(totalDurationMs / totalSessions)) : '0m'}
          </p>
        </div>
        <div className="p5-card p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#e60012] block">
            SESI PUP / SANTAI
          </span>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-[#ff4d4d] tabular-nums">
            {filtered.filter((f) => f.need === 'pup').length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p5-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter cakupan riwayat"
            className="inline-flex items-center gap-1 bg-black p-1 border-2 border-white shadow-[2px_2px_0px_#000000]"
          >
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`p5-badge px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                scope === 'mine'
                  ? 'bg-[#e60012] text-white border border-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="transform skew-x-[6deg] inline-block">CATATAN SAYA</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p5-badge px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-[#e60012] text-white border border-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="transform skew-x-[6deg] inline-block">SEMUA KARYAWAN</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter jenis keperluan"
            className="inline-flex items-center gap-1 bg-black p-1 border-2 border-white shadow-[2px_2px_0px_#000000]"
          >
            {(
              [
                { id: 'all', label: 'SEMUA' },
                { id: 'pup', label: 'PUP 💩' },
                { id: 'cepat', label: 'CEPAT ⚡' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNeedFilter(tab.id)}
                className={`p5-badge px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                  needFilter === tab.id
                    ? 'bg-white text-black border border-black'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span className="transform skew-x-[6deg] inline-block">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Cari riwayat karyawan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau divisi..."
            className="w-full border-2 border-white bg-black py-2 pl-10 pr-3.5 text-xs font-bold text-white placeholder:text-slate-500 focus:border-[#e60012] focus:outline-none shadow-[3px_3px_0px_#000000]"
          />
        </div>
      </div>

      {/* Persona 5 Data Table */}
      <div className="p5-card overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-black uppercase text-white">
              {scope === 'mine'
                ? 'Kamu belum memiliki catatan sesi yang cocok'
                : 'Tidak ada catatan yang cocok'}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              Coba ubah filter atau gunakan bilik toilet dari dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-[#1e1e24] text-xs font-black uppercase text-white">
                  <th className="px-5 py-3.5">KARYAWAN</th>
                  <th className="px-5 py-3.5">KEPERLUAN</th>
                  <th className="px-5 py-3.5 text-right">MULAI</th>
                  <th className="px-5 py-3.5 text-right">SELESAI</th>
                  <th className="px-5 py-3.5 text-right">DURASI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/40">
                {filtered.map((item) => {
                  const isMe = item.userId === currentUserId;
                  const displayName = isMe
                    ? `${item.displayName} (KAMU)`
                    : getPublicDisplayName(item.displayName, item.isAnonymous, item.userId);
                  return (
                    <tr key={item.id} className="hover:bg-black/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-black uppercase text-white">{displayName}</p>
                        {item.department ? (
                          <p className="text-xs font-bold text-slate-400 uppercase">{item.department}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-black uppercase ${
                            item.need === 'pup' ? 'text-[#ff4d4d]' : 'text-amber-300'
                          }`}
                        >
                          {item.need === 'pup' ? '💩 PUP' : '⚡ CEPAT'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-white">
                        {formatTimeOnly(item.startedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-white">
                        {formatTimeOnly(item.endedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-black tabular-nums text-white">
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
