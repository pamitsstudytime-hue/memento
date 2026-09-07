import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Clock,
  FileText,
  Sparkles,
  Plus,
  KeyRound,
  Settings,
  Palette,
  Database,
  Lock,
  Keyboard,
  Trash2,
  Info,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { ThemeMode, CategoryFilter, getNoteCategory } from '../types';
import { NoteItem } from './EmptyBody';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { triggerHaptic } from '../lib/capacitor';

interface SearchDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  notes: NoteItem[];
  autoOpenKeyboard?: boolean;
  defaultCategory?: CategoryFilter;
  onClose: () => void;
  onSelectNote: (note: NoteItem) => void;
  onCreateWithTitle: (title: string) => void;
  onOpenSettings?: () => void;
  onOpenData?: () => void;
  onToggleTheme?: () => void;
}

const ALL_CATEGORY_CHIPS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'Todo' },
  { id: 'safe', label: 'Safe' },
  { id: 'diary', label: 'Diary' },
  { id: 'notes', label: 'Notes' },
  { id: 'settings', label: 'Settings' },
];

export function SearchDrawer({
  isOpen,
  theme,
  notes,
  autoOpenKeyboard = true,
  defaultCategory = 'all',
  onClose,
  onSelectNote,
  onCreateWithTitle,
  onOpenSettings,
  onOpenData,
  onToggleTheme,
}: SearchDrawerProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>(defaultCategory || 'all');
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const recentTags = ['Ideas', 'Personal', 'Work', 'Reading', 'Tasks'];

  // Reorder chips so the default category for the current page is AT FIRST
  const orderedChips = useMemo(() => {
    const targetCat = defaultCategory || 'all';
    if (targetCat === 'all') {
      return ALL_CATEGORY_CHIPS;
    }
    const targetChip = ALL_CATEGORY_CHIPS.find((c) => c.id === targetCat);
    if (!targetChip) return ALL_CATEGORY_CHIPS;
    const remaining = ALL_CATEGORY_CHIPS.filter((c) => c.id !== targetCat);
    return [targetChip, ...remaining];
  }, [defaultCategory]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory(defaultCategory || 'all');
      if (autoOpenKeyboard) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen, defaultCategory, autoOpenKeyboard]);

  // Comprehensive list of app settings items that can be searched and opened directly
  const settingsItems = useMemo(
    () => [
      {
        id: 'setting-appearance',
        title: 'Appearance & Theme',
        description: 'Dark, Light, System modes, and visual accents',
        keywords: ['theme', 'dark', 'light', 'appearance', 'mode', 'color', 'style'],
        icon: Palette,
        badge: 'Appearance',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-theme-toggle',
        title: 'Toggle Theme',
        description: `Currently ${theme === 'dark' ? 'Dark' : 'Light'} mode (tap to switch)`,
        keywords: ['theme', 'dark', 'light', 'mode', 'switch'],
        icon: theme === 'dark' ? Sun : Moon,
        badge: 'Theme',
        action: () => {
          triggerHaptic('medium');
          if (onToggleTheme) onToggleTheme();
        },
      },
      {
        id: 'setting-data-backup',
        title: 'Backup & Restore Data',
        description: 'Export notes to JSON, import backups, or clear app data',
        keywords: ['backup', 'restore', 'data', 'export', 'import', 'json', 'download', 'storage'],
        icon: Database,
        badge: 'Storage',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenData) onOpenData();
          else if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-passkey',
        title: 'PassKey & Safe Vault',
        description: 'Master PIN, biometric setup, and personal safe credentials',
        keywords: ['passkey', 'password', 'pin', 'lock', 'vault', 'safe', 'security', 'biometric'],
        icon: Lock,
        badge: 'Security',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-navbar',
        title: 'Navigation Bar Style',
        description: 'Toggle between floating pill or fixed bottom navigation',
        keywords: ['navbar', 'navigation', 'floating', 'bar', 'pill', 'bottom', 'layout'],
        icon: Settings,
        badge: 'Layout',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-keyboard',
        title: 'Auto-Open Keyboard',
        description: 'Automatically focus keyboard input on search',
        keywords: ['keyboard', 'auto', 'focus', 'search', 'input'],
        icon: Keyboard,
        badge: 'General',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-trash',
        title: 'Trash & Recovery',
        description: 'View recently deleted notes and restore items',
        keywords: ['trash', 'bin', 'delete', 'deleted', 'restore', 'recycle'],
        icon: Trash2,
        badge: 'Data',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'setting-about',
        title: 'About Memento',
        description: 'Version 1.0.0, offline privacy, and local-first encryption',
        keywords: ['about', 'version', 'info', 'privacy', 'offline', 'memento'],
        icon: Info,
        badge: 'About',
        action: () => {
          triggerHaptic('light');
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
    ],
    [theme, onOpenSettings, onOpenData, onToggleTheme, onClose]
  );

  const filteredSettings = useMemo(() => {
    if (activeCategory !== 'settings' && activeCategory !== 'all') {
      return [];
    }
    if (!query.trim()) {
      return activeCategory === 'settings' ? settingsItems : [];
    }
    const q = query.toLowerCase().trim();
    return settingsItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [activeCategory, query, settingsItems]);

  const filteredNotes = useMemo(() => {
    if (activeCategory === 'settings') {
      return [];
    }
    const seen = new Set<string>();
    const list = notes.filter((n) => {
      if (activeCategory !== 'all') {
        const cat = getNoteCategory(n);
        if (cat !== activeCategory) return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.email && n.email.toLowerCase().includes(q))
      );
    });

    return list.map((n, idx) => {
      let id = n.id ? String(n.id).trim() : `search-note-${idx}`;
      if (!id || seen.has(id)) {
        id = `${id || 'note'}-${idx}-${seen.size}`;
      }
      seen.add(id);
      return n.id === id ? n : { ...n, id };
    });
  }, [notes, activeCategory, query]);

  const handleSelect = (note: NoteItem) => {
    onSelectNote(note);
    onClose();
  };

  const handleCreateNew = () => {
    if (query.trim()) {
      onCreateWithTitle(query.trim());
    } else {
      onCreateWithTitle('New Note');
    }
    onClose();
  };

  const isDesktop = useIsDesktop();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog/Drawer Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 28, stiffness: 300 }
            }
            className={`relative w-full max-w-md md:max-w-xl mx-auto rounded-t-3xl md:rounded-3xl pt-3 md:pt-6 pb-8 px-5 md:px-7 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] transition-colors duration-200 ${
              isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
            }`}
          >
            {/* Top drag handle indicator (mobile only) */}
            <div className="flex justify-center pb-3 md:hidden">
              <div
                className={`w-12 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Title & Close */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">Search</span>
              </div>
              <button
                id="search-drawer-close-btn"
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                    : 'bg-[#f0f1f4] text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <div
              className={`flex items-center rounded-2xl px-3.5 py-3 mb-3 shadow-inner transition-colors ${
                isDark ? 'bg-[#181818]' : 'bg-[#f0f1f4]'
              }`}
            >
              <Search
                className={`w-4 h-4 mr-2.5 shrink-0 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
                strokeWidth={2}
              />
              <input
                ref={inputRef}
                id="search-drawer-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  activeCategory === 'settings'
                    ? 'Search settings, theme, vault...'
                    : activeCategory === 'todo'
                    ? 'Search todos and tasks...'
                    : activeCategory === 'safe'
                    ? 'Search safe vault and keys...'
                    : activeCategory === 'diary'
                    ? 'Search diary entries...'
                    : 'Search notes, ideas, tags...'
                }
                className={`w-full bg-transparent text-sm font-medium focus:outline-none ${
                  isDark
                    ? 'text-white placeholder:text-neutral-500'
                    : 'text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear query"
                  className={`p-1 active:scale-90 transition-transform ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips: dynamically ordered so current page's category is first */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar py-0.5">
              {orderedChips.map((chip) => {
                const isActive = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    id={`search-chip-${chip.id}`}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveCategory(chip.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap active:scale-95 transition-all ${
                      isActive
                        ? isDark
                          ? 'bg-white text-black font-semibold shadow-xs'
                          : 'bg-neutral-900 text-white font-semibold shadow-xs'
                        : isDark
                        ? 'bg-[#181818] text-neutral-400 hover:text-neutral-200 border border-[#262626]'
                        : 'bg-[#f2f3f6] text-neutral-600 hover:text-neutral-900 border border-neutral-200/80'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Results list or Empty Suggestions */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 min-h-[160px] max-h-[42vh] pr-0.5">
              {/* Settings results when in Settings category OR matching in All */}
              {filteredSettings.length > 0 && (
                <div className="space-y-1.5 pb-2">
                  <div
                    className={`text-[11px] font-semibold tracking-wider uppercase px-1 pt-1 flex items-center justify-between ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    <span>Settings ({filteredSettings.length})</span>
                    {activeCategory !== 'settings' && (
                      <span className="text-[10px] text-emerald-500 font-medium">Quick actions</span>
                    )}
                  </div>

                  {filteredSettings.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl cursor-pointer active:scale-[0.99] transition-all text-left ${
                          isDark
                            ? 'bg-[#181818] hover:bg-[#202020]'
                            : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-[#242424] text-neutral-200' : 'bg-neutral-200/70 text-neutral-700'
                            }`}
                          >
                            <IconComp className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold truncate block">
                                {item.title}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                                  isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-200 text-neutral-600'
                                }`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] truncate ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Notes Results */}
              {filteredNotes.length > 0 ? (
                <div className="space-y-2">
                  <div
                    className={`text-[11px] font-semibold tracking-wider uppercase px-1 pt-1 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {query ? `Notes (${filteredNotes.length})` : 'Notes'}
                  </div>

                  {filteredNotes.map((note) => {
                    const isPassKey = note.entryType === 'passwords' || !!note.isSafe;

                    return (
                      <div
                        key={`search-result-${note.id}`}
                        onClick={() => handleSelect(note)}
                        role="button"
                        tabIndex={0}
                        className={`p-3.5 rounded-2xl cursor-pointer active:scale-[0.99] transition-all text-left ${
                          isDark
                            ? 'bg-[#181818] hover:bg-[#202020]'
                            : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold tracking-tight truncate">
                            {note.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isPassKey && (
                              <span
                                className={`w-4 h-4 md:w-auto md:h-auto p-0.5 md:px-1.5 md:py-0.5 rounded-full text-[9.5px] font-medium inline-flex items-center justify-center md:gap-1 ${
                                  isDark
                                    ? 'bg-[#262626] text-neutral-300'
                                    : 'bg-neutral-200 text-neutral-700'
                                }`}
                                title="Key"
                              >
                                <KeyRound className="w-2.5 h-2.5 shrink-0" />
                                <span className="hidden md:inline">Key</span>
                              </span>
                            )}
                            <span
                              className={`text-[11px] ${
                                isDark ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            >
                              {note.date}
                            </span>
                          </div>
                        </div>
                        {!isPassKey && note.content && (
                          <p
                            className={`text-xs line-clamp-2 leading-relaxed ${
                              isDark ? 'text-neutral-400' : 'text-neutral-600'
                            }`}
                          >
                            {note.content}
                          </p>
                        )}
                        {!isPassKey && (note.images?.[0] || note.imageUrl) && (
                          <div
                            className={`mt-2 rounded-xl overflow-hidden max-h-32 w-full border ${
                              isDark
                                ? 'bg-neutral-800 border-neutral-800/80'
                                : 'bg-neutral-50/50 border-neutral-200/40'
                            }`}
                          >
                            <img
                              src={note.images?.[0] || note.imageUrl}
                              alt=""
                              className="w-full h-32 object-cover rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : query && filteredSettings.length === 0 ? (
                /* No matches found in either notes or settings */
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${
                      isDark ? 'bg-[#181818] text-neutral-500' : 'bg-[#f0f1f4] text-neutral-400'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">No results for &ldquo;{query}&rdquo;</p>
                  {activeCategory !== 'settings' && (
                    <>
                      <p
                        className={`text-xs mt-1 max-w-[220px] ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        Would you like to start a new note with this title?
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all shadow-sm ${
                          isDark
                            ? 'bg-white text-black hover:bg-neutral-200'
                            : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create &ldquo;{query}&rdquo;</span>
                      </button>
                    </>
                  )}
                </div>
              ) : !query && filteredSettings.length === 0 ? (
                /* Empty query state with quick suggestions & tags */
                <div className="py-4 space-y-4">
                  <div>
                    <div
                      className={`text-[11px] font-semibold tracking-wider uppercase px-1 mb-2 flex items-center gap-1.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Suggested Topics</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentTags.map((tag, tIdx) => (
                        <button
                          key={`search-tag-${tag}-${tIdx}`}
                          type="button"
                          onClick={() => setQuery(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#181818] text-neutral-300 hover:bg-[#202020]'
                              : 'bg-[#f4f5f8] text-neutral-700 hover:bg-[#eceef2]'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl flex items-center gap-3 ${
                      isDark ? 'bg-[#181818]' : 'bg-[#f6f7fa]'
                    }`}
                  >
                    <Clock
                      className={`w-4 h-4 shrink-0 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Quick search across titles, note content, and settings.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
