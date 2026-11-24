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
import { useState } from 'react';
import type { UserAccount } from '../shared/types.ts';
import { PoopMiniIcon } from './PoopAnimations.tsx';

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

  const navItems =
    user.role === 'admin'
      ? [
          ...BASE_NAV_ITEMS,
          { id: 'admin' as const, label: 'Admin Panel', shortLabel: 'Admin', icon: ShieldCheck },
        ]
      : BASE_NAV_ITEMS;

  return (
    <>
      <aside
        className={`hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:overflow-y-auto z-30 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-60'
        }`}
      >
        {/* Header Branding + Minimize Toggle */}
        <div className={`flex h-16 items-center border-b border-slate-200 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/app-logo.png"
              alt="Ngising Logo"
              className="h-8 w-8 rounded-lg object-contain shadow-xs shrink-0 cursor-pointer"
              onClick={toggleCollapsed}
              title={isCollapsed ? 'Perbesar Sidebar' : undefined}
            />
            {!isCollapsed && (
              <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                Ngising
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-extrabold rounded-full bg-teal-100 text-teal-800 px-2 py-0.5 tracking-wide">
                LIVE
              </span>
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Kecilkan sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* When collapsed, small expand button under header */}
        {isCollapsed && (
          <div className="flex justify-center border-b border-slate-100 py-1.5">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Perbesar sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="relative flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span>{item.label}</span>}
                  {isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-mono font-bold text-white shadow-2xs">
                      {queueCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && item.id === 'dashboard' && queueCount > 0 && (
                  <span className="font-mono text-xs font-semibold tabular-nums text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded-md">
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Sound Bar */}
        <div className="border-t border-slate-200 p-3 space-y-3 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Suara Notifikasi</span>
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-label={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user.role === 'admin' ? 'Admin Kantor' : user.department || 'Karyawan'}
                  {user.isAnonymous ? ' · Mode Samaran' : ''}
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-teal-700" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Keluar Akun"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200/90 bg-white/95 backdrop-blur-xl px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden shadow-lg"
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
                isActive ? 'text-teal-800 bg-teal-50/80 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.id === 'dashboard' && queueCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-mono font-bold text-white shadow-2xs">
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
