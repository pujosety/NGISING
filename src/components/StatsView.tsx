import { useMemo } from 'react';
import {
  computeOfficeStats,
  computePersonalStats,
  formatDuration,
  formatMinutesLabel,
} from '../shared/queueLogic.ts';
import type { HistoryEntry, UserAccount } from '../shared/types.ts';

interface StatsViewProps {
  history: HistoryEntry[];
  user: UserAccount;
  now: number;
}

export function StatsView({ history, user, now }: StatsViewProps) {
  const personal = useMemo(
    () => computePersonalStats(history, user.id, now),
    [history, user.id, now]
  );
  const office = useMemo(() => computeOfficeStats(history, now), [history, now]);
  const maxHourlyCount = Math.max(
    1,
    ...office.hourly.map((bucket) => bucket.totalCount)
  );

  return (
    <div className="space-y-8">
      {/* Personal Statistics Section */}
      <section className="space-y-4" aria-labelledby="personal-stats-heading">
        <div>
          <h2 id="personal-stats-heading" className="font-display text-lg font-bold text-slate-900">
            Statistik Pribadi — {user.displayName}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Ringkasan kebiasaan dan catatan durasi khusus untuk akunmu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Sesi Saya Hari Ini</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              {personal.todaySessions}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {personal.pupSessions} Pup <span aria-hidden="true">·</span>{' '}
              {personal.cepatSessions} Cepat (total {personal.totalSessions})
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Rata-rata Pup Saya</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
              {personal.avgPupMs > 0 ? formatMinutesLabel(personal.avgPupMs) : '-'}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              {personal.avgPupMs > 0 ? `${formatDuration(personal.avgPupMs)} per sesi` : 'Belum ada data'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Total Waktu Hari Ini</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-teal-700">
              {personal.totalDurationTodayMs > 0
                ? formatDuration(personal.totalDurationTodayMs)
                : '00:00'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Akumulasi di toilet hari ini</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Rekor Terlama Saya</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              {personal.longestDurationMs > 0
                ? formatDuration(personal.longestDurationMs)
                : '00:00'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Durasi terpanjang tercatat</p>
          </div>
        </div>
      </section>

      {/* Office-Wide Statistics Section */}
      <section className="space-y-4" aria-labelledby="office-stats-heading">
        <div>
          <h2 id="office-stats-heading" className="font-display text-lg font-bold text-slate-900">
            Statistik Toilet Kantor
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Perbandingan aktivitas seluruh karyawan di 1 toilet kantor.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Total Sesi Kantor</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              {office.totalToday}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {office.pupToday} Pup <span aria-hidden="true">·</span> {office.cepatToday} Cepat
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Rata-rata Pup Kantor</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
              {formatMinutesLabel(office.avgPupMs)}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              {formatDuration(office.avgPupMs)} per sesi
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Rata-rata Cepat Kantor</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-teal-700">
              {formatMinutesLabel(office.avgCepatMs)}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              {formatDuration(office.avgCepatMs)} per sesi
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Jam Paling Ramai</p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              {office.peakHourLabel}
            </p>
            <p className="mt-1 text-xs text-slate-500">Berdasarkan log tercatat</p>
          </div>
        </div>

        {/* Hourly Activity Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Distribusi Kunjungan per Jam
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Perbandingan sesi Pup dan Cepat per jam.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-amber-500" aria-hidden="true" />
                <span>Pup</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-teal-600" aria-hidden="true" />
                <span>Cepat</span>
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-12 sm:gap-3 items-end">
            {office.hourly.map((bucket) => {
              const totalPct = Math.round((bucket.totalCount / maxHourlyCount) * 100);
              const pupPct =
                bucket.totalCount > 0 ? Math.round((bucket.pupCount / bucket.totalCount) * 100) : 0;
              return (
                <div
                  key={bucket.hour}
                  className="flex flex-col items-center justify-end gap-1.5"
                  title={`${bucket.label}: ${bucket.pupCount} Pup, ${bucket.cepatCount} Cepat`}
                >
                  <span className="h-4 font-mono text-[11px] font-semibold tabular-nums text-slate-600">
                    {bucket.totalCount > 0 ? bucket.totalCount : ''}
                  </span>
                  <div className="flex h-32 w-full max-w-[32px] items-end">
                    <div
                      className="flex w-full flex-col overflow-hidden rounded-t-md bg-slate-100"
                      style={{ height: `${bucket.totalCount > 0 ? Math.max(16, totalPct) : 4}%` }}
                    >
                      {bucket.totalCount > 0 ? (
                        <>
                          <div className="w-full bg-amber-500" style={{ height: `${pupPct}%` }} />
                          <div
                            className="w-full bg-teal-600"
                            style={{ height: `${100 - pupPct}%` }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">
                    {bucket.label.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Rekap Aktivitas Karyawan
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Diurutkan berdasarkan total durasi penggunaan tercatat.
            </p>
          </div>

          {office.leaderboard.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Belum ada sesi selesai untuk dirangkum.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Peringkat</th>
                    <th className="px-5 py-3">Karyawan</th>
                    <th className="px-5 py-3 text-right">Total Sesi</th>
                    <th className="px-5 py-3 text-right">Sesi Pup</th>
                    <th className="px-5 py-3 text-right">Rata-rata</th>
                    <th className="px-5 py-3 text-right">Terlama</th>
                    <th className="px-5 py-3 text-right">Total Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {office.leaderboard.map((row, idx) => (
                    <tr key={row.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold tabular-nums text-slate-500">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">
                          {row.userId === user.id ? `${user.displayName} (Kamu)` : row.displayName}
                        </p>
                        {row.department ? (
                          <p className="text-xs text-slate-500">{row.department}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                        {row.totalSessions}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-amber-700">
                        {row.pupSessions}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                        {formatDuration(row.avgDurationMs)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                        {formatDuration(row.longestDurationMs)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-bold tabular-nums text-slate-900">
                        {formatDuration(row.totalDurationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
