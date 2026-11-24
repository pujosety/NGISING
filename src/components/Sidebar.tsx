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
  { id: 'dashboard', label: 'DASHBOARD', shortLabel: 'DASHBOARD', icon: LayoutDashboard },
  { id: 'display', label: 'LAYAR MONITOR (TV)', shortLabel: 'LAYAR TV', icon: Tv },
  { id: 'history', label: 'RIWAYAT & LOG', shortLabel: 'RIWAYAT', icon: History },
  { id: 'stats', label: 'STATISTIK', shortLabel: 'STATISTIK', icon: BarChart3 },
  { id: 'account', label: 'AKUN SAYA', shortLabel: 'AKUN', icon: UserCog },
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
          { id: 'admin' as const, label: 'ADMIN PANEL', shortLabel: 'ADMIN', icon: ShieldCheck },
        ]
      : filteredBaseItems;

  return (
    <>
      <aside
        className={`hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:flex-col bg-[#0c0c0e] border-r-2 border-[#e60012] z-30 transition-[width] duration-200 ease-out select-none ${
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'
        }`}
      >
        {/* Header Branding + Minimize Toggle */}
        <div className={`flex h-16 items-center border-b-2 border-white/20 bg-black px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.15 }}
              onClick={toggleCollapsed}
              className="flex h-9 w-9 items-center justify-center bg-[#e60012] border-2 border-white shadow-[2px_2px_0px_#000000] cursor-pointer shrink-0"
              title={isCollapsed ? 'Perbesar Sidebar' : undefined}
            >
              <img
                src="/app-logo.png"
                alt="Ngising Logo"
                className="h-7 w-7 object-contain"
              />
            </motion.div>
            {!isCollapsed && (
              <span className="font-display text-xl font-black tracking-tighter text-white uppercase transform skew-x-[-4deg]">
                NGISING <span className="text-[#e60012]">P5</span>
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="p5-badge bg-[#e60012] text-white text-[10px] border border-white">
                LIVE
              </span>
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Kecilkan sidebar"
                className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* When collapsed, small expand button under header */}
        {isCollapsed && (
          <div className="flex justify-center border-b border-white/10 py-1.5 bg-black">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Perbesar sidebar"
              className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Persona Kinetic Navigation List */}
        <nav aria-label="Navigasi utama" className="flex-1 space-y-2 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex w-full items-center py-2.5 text-xs font-black tracking-wider transition-all cursor-pointer transform skew-x-[-6deg] border-2 ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } ${
                  isActive
                    ? 'bg-[#e60012] text-white border-white shadow-[4px_4px_0px_#000000] translate-x-1'
                    : 'bg-[#151518] text-slate-300 border-[#2e2e38] hover:border-[#e60012] hover:text-white hover:bg-[#1f1f24] hover:translate-x-1'
                }`}
              >
                <div className="relative flex items-center gap-2.5 z-10 transform skew-x-[6deg]">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#e60012]'}`} />
                  {!isCollapsed && <span className="uppercase">{item.label}</span>}
                  {isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center bg-white border border-black px-1 text-[9px] font-mono font-black text-black shadow-md">
                      {queueCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                  <span className="transform skew-x-[6deg] font-mono text-xs font-black tabular-nums text-black bg-white border border-black px-1.5 py-0.5 z-10">
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Sound Bar */}
        <div className="border-t-2 border-white/20 p-3 space-y-3 shrink-0 bg-black">
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">EFEK AUDIO</span>
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-label={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
                  className={`inline-flex h-7 items-center gap-1.5 px-2.5 text-xs font-black cursor-pointer border-2 ${
                    soundEnabled
                      ? 'bg-[#e60012] text-white border-white'
                      : 'bg-[#1e1e24] text-slate-400 border-[#2e2e38]'
                  }`}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3.5 w-3.5" />
                      <span>OFF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 border-2 border-white bg-[#151518] shadow-[3px_3px_0px_#e60012]">
                <p className="truncate text-sm font-black text-white uppercase tracking-tight">
                  {user.displayName}
                </p>
                <p className="truncate text-xs font-bold text-[#e60012] uppercase">
                  {user.role === 'admin' ? '👑 PHANTOM ADMIN' : user.department || 'PHANTOM THIEF'}
                  {user.isAnonymous ? ' · MASKED' : ''}
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-black text-black hover:bg-[#e60012] hover:text-white hover:border-white transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>LOGOUT</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onToggleSound}
                title={soundEnabled ? 'Suara Aktif' : 'Suara Senyap'}
                className="flex h-9 w-9 items-center justify-center border-2 border-white bg-[#151518] text-white hover:border-[#e60012] cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-[#e60012]" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Keluar Akun"
                className="flex h-9 w-9 items-center justify-center border-2 border-white bg-black text-white hover:bg-[#e60012] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Persona Style) */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around bg-black border-t-2 border-[#e60012] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] font-black tracking-tight transition-all cursor-pointer transform ${
                isActive
                  ? 'bg-[#e60012] text-white skew-x-[-6deg] shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative transform skew-x-[6deg]">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#e60012]'}`} />
                {item.id === 'dashboard' && queueCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] items-center justify-center bg-white text-black font-mono font-black text-[9px]">
                    {queueCount}
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap uppercase leading-none transform skew-x-[6deg]">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
