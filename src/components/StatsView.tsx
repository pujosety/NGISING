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
          <h2 id="personal-stats-heading" className="font-display text-2xl font-black uppercase tracking-tight text-white">
            STATISTIK PRIBADI // <span className="text-[#e60012]">{user.displayName}</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-400 uppercase">
            Ringkasan rekor dan kebiasaan ngising akunmu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="p5-card p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">SESI SAYA HARI INI</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-white">
              {personal.todaySessions}{' '}
              <span className="text-xs font-bold text-slate-400">/ 10 KUOTA</span>
            </p>
            <p className="mt-1 text-xs text-slate-300 font-bold tabular-nums uppercase">
              {personal.pupSessions} PUP <span aria-hidden="true">·</span>{' '}
              {personal.cepatSessions} CEPAT (TOTAL {personal.totalSessions})
            </p>
          </div>

          <div className="p5-card p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">RATA-RATA PUP SAYA</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-[#ff4d4d]">
              {personal.avgPupMs > 0 ? formatMinutesLabel(personal.avgPupMs) : '-'}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-slate-300 font-bold uppercase">
              {personal.avgPupMs > 0 ? `${formatDuration(personal.avgPupMs)} PER SESI` : 'BELUM ADA DATA'}
            </p>
          </div>

          <div className="p5-card p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">TOTAL WAKTU HARI INI</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-white">
              {personal.totalDurationTodayMs > 0
                ? formatDuration(personal.totalDurationTodayMs)
                : '00:00'}
            </p>
            <p className="mt-1 text-xs text-slate-400 font-bold uppercase">Akumulasi di bilik hari ini</p>
          </div>

          <div className="p5-card p-5">
            <p className="text-xs font-black uppercase tracking-wider text-[#e60012]">SESI TERLAMA</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums text-[#ff4d4d]">
              {personal.longestDurationMs > 0 ? formatDuration(personal.longestDurationMs) : '-'}
            </p>
            <p className="mt-1 text-xs text-slate-300 font-bold uppercase">Rekor ngeden terlama kamu</p>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="space-y-4" aria-labelledby="leaderboard-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="leaderboard-heading" className="font-display text-2xl font-black uppercase tracking-tight text-white">
              PAPAN PERINGKAT // LEADERBOARD
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-400 uppercase">
              Gelar tahta penguasa bilik toilet di kantor tercinta.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter periode leaderboard"
            className="inline-flex items-center gap-1 bg-black p-1 border-2 border-white shadow-[2px_2px_0px_#000000] self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setBoardScope('weekly')}
              className={`p5-badge px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                boardScope === 'weekly'
                  ? 'bg-[#e60012] text-white border border-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="transform skew-x-[6deg] inline-block">MINGGUAN (7 HARI)</span>
            </button>
            <button
              type="button"
              onClick={() => setBoardScope('today')}
              className={`p5-badge px-3 py-1.5 text-xs font-black uppercase transition-all cursor-pointer ${
                boardScope === 'today'
                  ? 'bg-[#e60012] text-white border border-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="transform skew-x-[6deg] inline-block">HARI INI</span>
            </button>
          </div>
        </div>

        {/* Podium Top 3 in Persona 5 High Voltage Style */}
        {topThreeWeekly.length > 0 && boardScope === 'weekly' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topThreeWeekly.map((entry, idx) => {
              const isFirst = idx === 0;
              const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
              const rankColor =
                idx === 0
                  ? 'text-amber-400'
                  : idx === 1
                    ? 'text-slate-200'
                    : 'text-amber-600';

              const rankTitles = [
                '👑 RAJA TAHTA KERAMIK (#1)',
                '🥈 PENDEKAR JAMBAN (#2)',
                '🥉 PETAPA BILIK (#3)',
              ];

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p5-card p-5 ${isFirst ? 'border-[#e60012] shadow-[6px_6px_0px_#e60012]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`inline-flex items-center gap-1.5 text-xs font-black uppercase ${rankColor}`}>
                        <RankIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{rankTitles[idx] || `PERINGKAT #${idx + 1}`}</span>
                      </p>
                      <h3 className="mt-1.5 font-display text-lg font-black uppercase text-white">
                        {entry.userId === user.id ? `${user.displayName} (KAMU)` : entry.displayName}
                      </h3>
                    </div>
                    {isFirst && <PoopMascot mood="called" size={48} interactive={true} />}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t-2 border-black pt-3">
                    <span className="font-mono text-xl font-black tabular-nums text-white">
                      {entry.totalSessions} SESI
                    </span>
                    <span className="font-mono text-xs font-black tabular-nums text-[#ff4d4d]">
                      {formatDuration(entry.totalDurationMs)} TOTAL
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="p5-card overflow-hidden p-0">
          <div className="border-b-2 border-black bg-black px-5 py-4">
            <h3 className="font-display text-base font-black uppercase tracking-tight text-white">
              {boardScope === 'weekly'
                ? 'KLASEMEN LENGKAP MINGGUAN (7 HARI TERAKHIR)'
                : 'REKAP AKTIVITAS HARI INI'}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-slate-400 uppercase">
              {boardScope === 'weekly'
                ? 'Diurutkan berdasarkan jumlah sesi terbanyak dalam 7 hari terakhir, lalu total durasi.'
                : 'Diurutkan berdasarkan total durasi penggunaan hari ini.'}
            </p>
          </div>

          {activeLeaderboard.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm font-bold text-slate-400 uppercase">
              Belum ada sesi selesai untuk dirangkum.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-black bg-[#1e1e24] text-xs font-black uppercase text-white">
                    <th className="px-5 py-3.5">PERINGKAT</th>
                    <th className="px-5 py-3.5">KARYAWAN / TAMU</th>
                    <th className="px-5 py-3.5 text-right">TOTAL SESI</th>
                    <th className="px-5 py-3.5 text-right">SESI PUP</th>
                    <th className="px-5 py-3.5 text-right">RATA-RATA</th>
                    <th className="px-5 py-3.5 text-right">TERLAMA</th>
                    <th className="px-5 py-3.5 text-right">TOTAL WAKTU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  {activeLeaderboard.map((row, idx) => (
                    <tr key={row.userId} className="hover:bg-black/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-black tabular-nums text-[#ff4d4d]">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-black uppercase text-white">
                          {row.userId === user.id ? `${user.displayName} (KAMU)` : row.displayName}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-black tabular-nums text-white">
                        {row.totalSessions}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-bold tabular-nums text-[#ff4d4d]">
                        {row.pupSessions}X
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-300">
                        {formatDuration(row.avgDurationMs)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-[#ff4d4d]">
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
        <div className="p5-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-black uppercase tracking-tight text-white">
                DISTRIBUSI KUNJUNGAN PER JAM
              </h3>
              <p className="mt-0.5 text-xs font-bold text-slate-400 uppercase">
                Perbandingan sesi Pup dan Cepat per jam.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-black uppercase">
              <span className="flex items-center gap-1.5 text-[#ff4d4d]">
                <span className="inline-block h-3 w-3 bg-[#e60012] border border-white" aria-hidden="true" />
                <span>PUP</span>
              </span>
              <span className="flex items-center gap-1.5 text-white">
                <span className="inline-block h-3 w-3 bg-white border border-black" aria-hidden="true" />
                <span>CEPAT</span>
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
                  <span className="h-4 font-mono text-[11px] font-black tabular-nums text-white">
                    {bucket.totalCount > 0 ? bucket.totalCount : ''}
                  </span>
                  <div className="flex h-32 w-full max-w-[32px] items-end">
                    <div
                      className="flex w-full flex-col overflow-hidden bg-black border-2 border-white shadow-[2px_2px_0px_#000000]"
                      style={{ height: `${bucket.totalCount > 0 ? Math.max(16, totalPct) : 6}%` }}
                    >
                      {bucket.totalCount > 0 ? (
                        <>
                          <div className="w-full bg-[#e60012]" style={{ height: `${pupPct}%` }} />
                          <div
                            className="w-full bg-white"
                            style={{ height: `${100 - pupPct}%` }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold tabular-nums text-slate-400">
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
