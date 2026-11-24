import {
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Tv,
  UserCog,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { UserAccount } from '../shared/types.ts';
import { isAndroidOrNative } from '../utils/platform.ts';

export type WorkspaceTab = 'dashboard' | 'history' | 'stats' | 'account' | 'admin' | 'display';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  user: UserAccount;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
  queueCount: number;
}

const BASE_NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard Saya', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'display', label: 'Layar Monitor (TV)', shortLabel: 'Layar TV', icon: Tv },
  { id: 'history', label: 'Riwayat & Log', shortLabel: 'Riwayat', icon: History },
  { id: 'stats', label: 'Statistik', shortLabel: 'Statistik', icon: BarChart3 },
  { id: 'account', label: 'Akun Saya', shortLabel: 'Akun', icon: UserCog },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  user,
  soundEnabled,
  onToggleSound,
  onLogout,
  queueCount,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ngising_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ngising_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isAndroid = isAndroidOrNative();
  const filteredBaseItems = isAndroid
    ? BASE_NAV_ITEMS.filter((item) => item.id !== 'display')
    : BASE_NAV_ITEMS;

  const navItems =
    user.role === 'admin'
      ? [
          ...filteredBaseItems,
          { id: 'admin' as const, label: 'Admin Panel', shortLabel: 'Admin', icon: ShieldCheck },
        ]
      : filteredBaseItems;

  return (
    <>
      <aside
        className={`hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:flex-col glass-panel border-r border-[#c99f57]/20 lg:overflow-y-auto z-30 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-60'
        }`}
      >
        {/* Header Branding + Minimize Toggle */}
        <div className={`flex h-16 items-center border-b border-[#c99f57]/15 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.img
              whileHover={{ scale: 1.1, rotate: 5 }}
              src="/app-logo.png"
              alt="Ngising Logo"
              className="h-8 w-8 rounded-lg object-contain drop-shadow-md shrink-0 cursor-pointer"
              onClick={toggleCollapsed}
              title={isCollapsed ? 'Perbesar Sidebar' : undefined}
            />
            {!isCollapsed && (
              <span className="font-display text-xl font-black tracking-tight text-white whitespace-nowrap">
                Ngising <span className="text-[#dbc08b]">App</span>
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-black rounded-full bg-[#ad7c2b]/30 text-[#e8d9b5] px-2 py-0.5 tracking-wide border border-[#c99f57]/30">
                LIVE
              </span>
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Kecilkan sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#dbc08b]/70 hover:bg-[#3e2610]/60 hover:text-white transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* When collapsed, small expand button under header */}
        {isCollapsed && (
          <div className="flex justify-center border-b border-[#c99f57]/10 py-1.5">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Perbesar sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#dbc08b]/70 hover:bg-[#3e2610]/60 hover:text-white transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav aria-label="Navigasi utama" className="flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex w-full items-center rounded-xl py-2.5 text-sm font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } ${
                  isActive
                    ? 'text-white shadow-lg border border-[#c99f57]/40 bg-gradient-to-r from-[#8c5d1d]/90 to-[#ad7c2b]/80'
                    : 'text-[#e8d9b5]/70 hover:bg-[#3e2610]/50 hover:text-white'
                }`}
              >
                <div className="relative flex items-center gap-2.5 z-10">
                  <Icon className="h-4 w-4 shrink-0 text-[#dbc08b]" aria-hidden="true" />
                  {!isCollapsed && <span>{item.label}</span>}
                  {isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ad7c2b] px-1 text-[9px] font-mono font-bold text-white shadow-md">
                      {queueCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                  <span className="font-mono text-xs font-bold tabular-nums text-white bg-[#553514] border border-[#c99f57]/30 px-1.5 py-0.5 rounded-md z-10">
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Sound Bar in Glass Style */}
        <div className="border-t border-[#c99f57]/15 p-3 space-y-3 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dbc08b]/80">Suara Efek</span>
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-label={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
                  className="glass-pill inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#e8d9b5] hover:text-white transition-colors cursor-pointer"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-[#dbc08b]" aria-hidden="true" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>Senyap</span>
                    </>
                  )}
                </button>
              </div>

              <div className="glass-card rounded-xl p-3 border border-[#c99f57]/20">
                <p className="truncate text-sm font-bold text-white">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-[#dbc08b]">
                  {user.role === 'admin' ? '👑 Admin Kantor' : user.department || 'Karyawan'}
                  {user.isAnonymous ? ' · Mode Samaran' : ''}
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c99f57]/30 bg-[#241407]/80 px-3 py-1.5 text-xs font-bold text-[#e8d9b5] hover:bg-rose-950/60 hover:text-rose-200 hover:border-rose-500/40 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-[#dbc08b]" aria-hidden="true" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleSound}
                title={soundEnabled ? 'Suara Aktif (Klik untuk senyap)' : 'Suara Senyap (Klik untuk aktifkan)'}
                className="glass-pill flex h-9 w-9 items-center justify-center rounded-xl text-[#dbc08b] hover:text-white transition-colors cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-[#dbc08b]" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Keluar Akun"
                className="glass-pill flex h-9 w-9 items-center justify-center rounded-xl text-[#dbc08b] hover:bg-rose-950/60 hover:text-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Glassmorphic) */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around glass-panel border-t border-[#c99f57]/20 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden shadow-2xl backdrop-blur-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex min-h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-white bg-gradient-to-t from-[#8c5d1d]/80 to-[#ad7c2b]/80 border border-[#c99f57]/40 shadow-md'
                  : 'text-[#e8d9b5]/70 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4 text-[#dbc08b]" aria-hidden="true" />
                {item.id === 'dashboard' && queueCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ad7c2b] px-1 text-[9px] font-mono font-bold text-white shadow-md">
                    {queueCount}
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap leading-none">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
