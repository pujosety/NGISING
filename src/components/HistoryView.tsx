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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Riwayat & Log Penggunaan
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Catatan sesi pribadimu maupun log seluruh karyawan di Toilet Kantor.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Download className="h-4 w-4 text-slate-600" aria-hidden="true" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Scope & Filter Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Pilih cakupan riwayat"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'mine'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Saya
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Karyawan
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter jenis keperluan"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'pup', label: 'Pup' },
                { id: 'cepat', label: 'Cepat' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNeedFilter(tab.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  needFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Cari riwayat karyawan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan atau divisi..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {scope === 'mine'
                ? 'Kamu belum memiliki catatan sesi yang cocok'
                : 'Tidak ada catatan yang cocok'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Coba ubah filter atau mulai gunakan Toilet Kantor dari halaman Dashboard Saya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Karyawan</th>
                  <th className="px-4 py-3">Keperluan</th>
                  <th className="px-4 py-3 text-right">Mulai</th>
                  <th className="px-4 py-3 text-right">Selesai</th>
                  <th className="px-4 py-3 text-right">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isMe = item.userId === currentUserId;
                  const displayName = isMe
                    ? `${item.displayName} (Kamu)`
                    : getPublicDisplayName(item.displayName, item.isAnonymous, item.userId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{displayName}</p>
                        {item.department ? (
                          <p className="text-xs text-slate-500">{item.department}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            item.need === 'pup' ? 'text-amber-700' : 'text-teal-700'
                          }`}
                        >
                          {item.need === 'pup' ? 'Pup' : 'Cepat'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                        {formatTimeOnly(item.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-600">
                        {formatTimeOnly(item.endedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
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
