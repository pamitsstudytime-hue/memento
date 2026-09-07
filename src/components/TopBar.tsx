import {
  Search,
  X,
  Feather,
  Shield,
  KeyRound,
  ListTodo,
  BookOpen,
  Layers,
} from 'lucide-react';
import { NavTab, ThemeMode, HomeChipFilter } from '../types';
import { triggerHaptic } from '../lib/capacitor';

export const CHIPS: Array<{
  id: HomeChipFilter;
  label: string;
  icon: typeof Feather;
}> = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'note', label: 'Note', icon: Feather },
  { id: 'safe', label: 'Safe', icon: Shield },
  { id: 'key', label: 'Key', icon: KeyRound },
  { id: 'todo', label: 'Todo', icon: ListTodo },
  { id: 'diary', label: 'Diary', icon: BookOpen },
];

interface TopBarProps {
  theme: ThemeMode;
  activeTab?: NavTab;
  activeChip?: HomeChipFilter;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenSearch: () => void;
  onOpenNewNote?: () => void;
  showChips?: boolean;
  onSelectChip?: (chip: HomeChipFilter) => void;
  chipCounts?: Record<HomeChipFilter, number>;
}

export function TopBar({
  theme,
  activeTab = 'home',
  activeChip = 'all',
  searchQuery = '',
  onSearchChange,
  onOpenSearch,
  showChips = false,
  onSelectChip,
  chipCounts = { all: 0, note: 0, safe: 0, key: 0, todo: 0, diary: 0 },
}: TopBarProps) {
  const isDark = theme === 'dark';

  const sectionTitles: Partial<Record<NavTab, string>> = {
    home: 'All Notes',
    notes: 'All Notes',
    todo: 'Tasks & Todos',
    vault: 'Safe Vault',
    safe: 'Safe Vault',
    favorites: 'Favourites',
    diary: 'Personal Diary',
    archive: 'Archive',
  };

  const chipTitles: Record<HomeChipFilter, string> = {
    all: 'All Notes',
    note: 'Notes',
    safe: 'Safe Vault',
    key: 'Keys & Passwords',
    todo: 'Todo Tasks',
    diary: 'Personal Diary',
  };

  const currentTitle =
    (activeTab === 'home' || activeTab === 'notes') && activeChip
      ? chipTitles[activeChip] || 'Notes'
      : sectionTitles[activeTab] || 'Notes';

  const handleChipClick = (chipId: HomeChipFilter) => {
    triggerHaptic('selection');
    onSelectChip?.(chipId);
  };

  return (
    <header
      className={`shrink-0 z-30 w-full transition-colors duration-200 ${
        isDark ? 'bg-[#09090b]' : 'bg-[#f4f4f6]'
      }`}
    >
      {/* Top Row: Brand / Section Title, Desktop Search Bar, Search Button */}
      <div className="px-5 md:px-8 pt-[max(calc(var(--safe-top,0px)+0.75rem),1.25rem)] md:pt-6 pb-2 md:pb-3 flex items-center justify-between">
        {/* Left side: Mobile brand title or Desktop section title */}
        <div className="flex items-center gap-3">
          {/* Mobile brand title */}
          <h1
            className={`text-2xl font-semibold tracking-tight select-none md:hidden ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            memento
          </h1>

          {/* Desktop section title */}
          <div className="hidden md:flex items-center gap-2.5">
            <h2
              className={`text-xl font-bold tracking-tight select-none ${
                isDark ? 'text-white' : 'text-neutral-900'
              }`}
            >
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Center: Desktop Flexible Search Bar */}
        <div className="hidden md:flex flex-1 justify-center max-w-sm lg:max-w-md xl:max-w-lg mx-4">
          <div
            className={`flex items-center gap-2.5 px-4 h-10 lg:h-11 rounded-full w-full transition-all duration-200 group border shadow-xs ${
              isDark
                ? 'bg-[#151515] hover:bg-[#1a1a1a] border-neutral-800/80 focus-within:border-neutral-600 focus-within:bg-[#181818] focus-within:ring-2 focus-within:ring-white/5'
                : 'bg-[#eeeff2] hover:bg-[#e6e8ed] border-neutral-200/70 focus-within:border-neutral-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5'
            }`}
          >
            <Search
              className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                isDark
                  ? 'text-neutral-500 group-focus-within:text-neutral-200'
                  : 'text-neutral-400 group-focus-within:text-neutral-800'
              }`}
              strokeWidth={2}
            />
            <input
              id="desktop-quick-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search notes, checklists, keys..."
              className={`w-full bg-transparent text-sm font-normal outline-none transition-colors ${
                isDark
                  ? 'text-white placeholder-neutral-500'
                  : 'text-neutral-900 placeholder-neutral-400'
              }`}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className={`p-1 rounded-full hover:opacity-80 transition-opacity shrink-0 ${
                  isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
                }`}
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <button
            id="top-bar-search-btn"
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSearch?.();
            }}
            aria-label="Open search menu"
            className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
              isDark
                ? 'text-neutral-300 hover:text-white bg-[#181818] hover:bg-[#222222]'
                : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
            }`}
          >
            <Search className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Attached Filter Chips Bar (Directly below brand title with no transparent gap) */}
      {showChips && (
        <div
          id="home-chips-bar"
          className="px-5 md:px-8 pb-2.5 pt-0 overflow-x-auto no-scrollbar scroll-smooth"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            {CHIPS.map((chip) => {
              const ChipIcon = chip.icon;
              const isActive = activeChip === chip.id;
              const count = chipCounts[chip.id] ?? 0;
              return (
                <button
                  key={chip.id}
                  id={`home-chip-${chip.id}`}
                  type="button"
                  onClick={() => handleChipClick(chip.id)}
                  className={`h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-full inline-flex items-center gap-1.5 shrink-0 text-xs sm:text-[13px] font-medium tracking-tight active:scale-95 transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? isDark
                        ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-xs'
                        : 'bg-neutral-900 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-[#18181b] hover:bg-[#222226] text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
                      : 'bg-[#eeeff2] hover:bg-[#e4e6ea] text-neutral-600 hover:text-neutral-900 border border-neutral-200/80'
                  }`}
                >
                  <ChipIcon
                    className={`w-3.5 h-3.5 stroke-[2] shrink-0 transition-colors ${
                      isActive
                        ? isDark
                          ? 'text-neutral-950'
                          : 'text-white'
                        : isDark
                        ? 'text-neutral-400'
                        : 'text-neutral-500'
                    }`}
                  />
                  <span className="whitespace-nowrap">{chip.label}</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-neutral-950/15 text-neutral-950'
                          : 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-neutral-800 text-neutral-400'
                        : 'bg-neutral-300/70 text-neutral-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
