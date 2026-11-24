import { Award, Medal, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  computeOfficeStats,
  computePersonalStats,
  formatDuration,
  formatMinutesLabel,
} from '../shared/queueLogic.ts';
import type { HistoryEntry, UserAccount } from '../shared/types.ts';
import { PoopMascot } from './PoopAnimations.tsx';

interface StatsViewProps {
  history: HistoryEntry[];
  user: UserAccount;
  now: number;
}

export function StatsView({ history, user, now }: StatsViewProps) {
  const [boardScope, setBoardScope] = useState<'weekly' | 'today'>('weekly');

  const personal = useMemo(
    () => computePersonalStats(history, user.id, now),
    [history, user.id, now]
  );
  const office = useMemo(() => computeOfficeStats(history, now), [history, now]);
  const maxHourlyCount = Math.max(
    1,
    ...office.hourly.map((bucket) => bucket.totalCount)
  );

  const topThreeWeekly = office.weeklyLeaderboard.slice(0, 3);
  const activeLeaderboard =
    boardScope === 'weekly' ? office.weeklyLeaderboard : office.leaderboard;

  return (
    <div className="space-y-8">
      {/* Personal Statistics Section */}
      <section className="space-y-4" aria-labelledby="personal-stats-heading">
        <div>
          <h2 id="personal-stats-heading" className="font-display text-2xl font-black text-white">
            Statistik Pribadi — <span className="text-[#dbc08b]">{user.displayName}</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-[#dbc08b]/80">
            Ringkasan kebiasaan dan catatan durasi khusus untuk akunmu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-card rounded-2xl p-5 border border-[#c99f57]/20">
            <p className="text-xs font-bold uppercase tracking-wider text-[#dbc08b]/70">Sesi Saya Hari Ini</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-white">
              {personal.todaySessions}{' '}
              <span className="text-xs font-normal text-[#dbc08b]/70">/ 10 kuota</span>
            </p>
            <p className="mt-1 text-xs text-[#dbc08b]/80 tabular-nums">
              {personal.pupSessions} Pup <span aria-hidden="true">·</span>{' '}
              {personal.cepatSessions} Cepat (total {personal.totalSessions})
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-[#c99f57]/20">
            <p className="text-xs font-bold uppercase tracking-wider text-[#dbc08b]/70">Rata-rata Pup Saya</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-[#dbc08b]">
              {personal.avgPupMs > 0 ? formatMinutesLabel(personal.avgPupMs) : '-'}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-[#dbc08b]/80">
              {personal.avgPupMs > 0 ? `${formatDuration(personal.avgPupMs)} per sesi` : 'Belum ada data'}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-[#c99f57]/20">
            <p className="text-xs font-bold uppercase tracking-wider text-[#dbc08b]/70">Total Waktu Hari Ini</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-teal-300">
              {personal.totalDurationTodayMs > 0
                ? formatDuration(personal.totalDurationTodayMs)
                : '00:00'}
            </p>
            <p className="mt-1 text-xs text-[#dbc08b]/80">Akumulasi di toilet hari ini</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-[#c99f57]/20">
            <p className="text-xs font-bold uppercase tracking-wider text-[#dbc08b]/70">Sesi Terlama</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-rose-300">
              {personal.longestDurationMs > 0 ? formatDuration(personal.longestDurationMs) : '-'}
            </p>
            <p className="mt-1 text-xs text-[#dbc08b]/80">Rekor ngeden terlama kamu</p>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="space-y-4" aria-labelledby="leaderboard-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="leaderboard-heading" className="font-display text-2xl font-black text-white">
              Papan Peringkat Kantor
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#dbc08b]/80">
              Gelar tahta penguasa bilik toilet di kantor tercinta.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter periode leaderboard"
            className="inline-flex items-center gap-1 rounded-xl bg-[#241407]/70 p-1 border border-[#c99f57]/20 self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setBoardScope('weekly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                boardScope === 'weekly'
                  ? 'bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] text-white shadow-sm'
                  : 'text-[#dbc08b]/70 hover:text-white'
              }`}
            >
              Mingguan (7 Hari)
            </button>
            <button
              type="button"
              onClick={() => setBoardScope('today')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                boardScope === 'today'
                  ? 'bg-gradient-to-r from-[#8c5d1d] to-[#ad7c2b] text-white shadow-sm'
                  : 'text-[#dbc08b]/70 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Podium Top 3 */}
        {topThreeWeekly.length > 0 && boardScope === 'weekly' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topThreeWeekly.map((entry, idx) => {
              const isFirst = idx === 0;
              const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
              const rankColor =
                idx === 0
                  ? 'text-amber-400'
                  : idx === 1
                    ? 'text-slate-300'
                    : 'text-[#c99f57]';

              const rankTitles = [
                '👑 Raja Tahta Keramik (#1)',
                '🥈 Pendekar Jamban (#2)',
                '🥉 Petapa Bilik (#3)',
              ];

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-card rounded-3xl p-5 border transition-all ${
                    isFirst
                      ? 'border-[#c99f57] ring-2 ring-[#ad7c2b]/40 glow-poop'
                      : 'border-[#c99f57]/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`inline-flex items-center gap-1.5 text-xs font-black ${rankColor}`}>
                        <RankIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{rankTitles[idx] || `Peringkat #${idx + 1}`}</span>
                      </p>
                      <h3 className="mt-1.5 font-display text-lg font-bold text-white">
                        {entry.userId === user.id ? `${user.displayName} (Kamu)` : entry.displayName}
                      </h3>
                      {entry.department ? (
                        <p className="text-xs text-[#dbc08b]/70">{entry.department}</p>
                      ) : null}
                    </div>
                    {isFirst && <PoopMascot mood="called" size={48} interactive={true} />}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-[#c99f57]/15 pt-3">
                    <span className="font-mono text-xl font-black tabular-nums text-white">
                      {entry.totalSessions} sesi
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#dbc08b]">
                      {formatDuration(entry.totalDurationMs)} total
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="glass-card overflow-hidden rounded-3xl border border-[#c99f57]/20">
          <div className="border-b border-[#c99f57]/20 px-5 py-4">
            <h3 className="font-display text-base font-bold text-white">
              {boardScope === 'weekly'
                ? 'Klasemen Lengkap Mingguan (7 Hari Terakhir)'
                : 'Rekap Aktivitas Hari Ini'}
            </h3>
            <p className="mt-0.5 text-xs text-[#dbc08b]/80">
              {boardScope === 'weekly'
                ? 'Diurutkan berdasarkan jumlah sesi terbanyak dalam 7 hari terakhir, lalu total durasi.'
                : 'Diurutkan berdasarkan total durasi penggunaan hari ini.'}
            </p>
          </div>

          {activeLeaderboard.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#dbc08b]/70">
              Belum ada sesi selesai untuk dirangkum.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#c99f57]/20 bg-[#241407]/60 text-xs font-bold text-[#dbc08b]">
                    <th className="px-5 py-3.5">Peringkat</th>
                    <th className="px-5 py-3.5">Karyawan / Tamu</th>
                    <th className="px-5 py-3.5 text-right">Total Sesi</th>
                    <th className="px-5 py-3.5 text-right">Sesi Pup</th>
                    <th className="px-5 py-3.5 text-right">Rata-rata</th>
                    <th className="px-5 py-3.5 text-right">Terlama</th>
                    <th className="px-5 py-3.5 text-right">Total Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c99f57]/10">
                  {activeLeaderboard.map((row, idx) => (
                    <tr key={row.userId} className="hover:bg-[#3e2610]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-black tabular-nums text-[#dbc08b]">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-white">
                          {row.userId === user.id ? `${user.displayName} (Kamu)` : row.displayName}
                        </p>
                        {row.department ? (
                          <p className="text-xs text-[#dbc08b]/70">{row.department}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-black tabular-nums text-white">
                        {row.totalSessions}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-[#dbc08b]">
                        {row.pupSessions}x
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-[#e8d9b5]/80">
                        {formatDuration(row.avgDurationMs)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-rose-300">
                        {formatDuration(row.longestDurationMs)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-black tabular-nums text-white">
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

      {/* Hourly Chart Section */}
      <section className="space-y-4">
        <div className="glass-card rounded-3xl p-5 border border-[#c99f57]/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Distribusi Kunjungan per Jam
              </h3>
              <p className="mt-0.5 text-xs text-[#dbc08b]/80">
                Perbandingan sesi Pup dan Cepat per jam.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#dbc08b]">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#ad7c2b]" aria-hidden="true" />
                <span>Pup</span>
              </span>
              <span className="flex items-center gap-1.5 text-teal-300">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-teal-500" aria-hidden="true" />
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
                  <span className="h-4 font-mono text-[11px] font-black tabular-nums text-[#dbc08b]">
                    {bucket.totalCount > 0 ? bucket.totalCount : ''}
                  </span>
                  <div className="flex h-32 w-full max-w-[32px] items-end">
                    <div
                      className="flex w-full flex-col overflow-hidden rounded-t-lg bg-[#241407]/60 border border-[#c99f57]/30"
                      style={{ height: `${bucket.totalCount > 0 ? Math.max(16, totalPct) : 4}%` }}
                    >
                      {bucket.totalCount > 0 ? (
                        <>
                          <div className="w-full bg-[#ad7c2b]" style={{ height: `${pupPct}%` }} />
                          <div
                            className="w-full bg-teal-500"
                            style={{ height: `${100 - pupPct}%` }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-[#dbc08b]/70">
                    {bucket.label.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
