import React from 'react';
import { ViewTab } from '../types';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Server,
  Plus,
  Maximize2,
  Minimize2,
  Moon,
  Sun
} from 'lucide-react';

interface TopBarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenNewEvent: () => void;
  isKiosk: boolean;
  onToggleKiosk: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeCalendarCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewEvent,
  isKiosk,
  onToggleKiosk,
  isDarkMode,
  onToggleDarkMode
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-8 h-16">
          {/* Zone 1: Single text element brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <span className="text-lg font-bold">H</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                HomeBoard
              </span>
            </button>
          </div>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('calendar')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'calendar'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>Kalender</span>
            </button>

            <button
              onClick={() => onTabChange('chores')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'chores'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Takenbord</span>
            </button>

            <button
              onClick={() => onTabChange('docker')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentTab === 'docker'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>Docker & Setup</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action button + utility controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Lichte modus inschakelen' : 'Donkere modus inschakelen'}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Wissel thema"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleKiosk}
              title={isKiosk ? 'Kiosk-modus sluiten' : 'Kiosk / Wandtablet weergave'}
              className={`p-2 rounded-lg transition-colors ${
                isKiosk
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-label="Wissel kioskmodus"
            >
              {isKiosk ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenNewEvent}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Afspraak</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
