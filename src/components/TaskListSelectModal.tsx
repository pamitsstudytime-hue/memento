import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ListTodo,
  Plus,
  Folder,
  Search,
  Check,
  FolderPlus,
} from 'lucide-react';
import { NoteItem } from '../types';
import { getTodoIconComponent } from '../lib/todoIcons';
import { triggerHaptic } from '../lib/capacitor';

interface TaskListSelectModalProps {
  isOpen: boolean;
  taskText: string;
  dateStr: string;
  todayStr: string;
  isDark: boolean;
  allLists: NoteItem[];
  onClose: () => void;
  onSelectList: (listId?: string, newListName?: string) => void;
}

export const TaskListSelectModal: React.FC<TaskListSelectModalProps> = ({
  isOpen,
  taskText,
  dateStr,
  todayStr,
  isDark,
  allLists,
  onClose,
  onSelectList,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Format date display for subtitle
  const formattedDate = useMemo(() => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      return target.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  // Filter available non-today user lists
  const filteredUserLists = useMemo(() => {
    const regularLists = allLists.filter((l) => {
      if (l.isTodayList || l.isArchived) return false;
      const t = (l.title || '').trim().toLowerCase();
      // Exclude today lists or already existing 'others' / 'unnamed list' to show in dedicated sections
      return t !== 'today' && t !== 'others' && t !== 'unnamed list' && t !== 'unnamed';
    });

    if (!searchQuery.trim()) return regularLists;
    const q = searchQuery.toLowerCase().trim();
    return regularLists.filter((l) => (l.title || '').toLowerCase().includes(q));
  }, [allLists, searchQuery]);

  // Check if an existing "Others" or "Unnamed list" is present
  const existingOthers = useMemo(() => {
    return allLists.find((l) => {
      const t = (l.title || '').trim().toLowerCase();
      return (t === 'others' || t === 'other') && !l.isArchived;
    });
  }, [allLists]);

  const existingUnnamed = useMemo(() => {
    return allLists.find((l) => {
      const t = (l.title || '').trim().toLowerCase();
      return (t === 'unnamed list' || t === 'unnamed') && !l.isArchived;
    });
  }, [allLists]);

  if (!isOpen) return null;

  const handleSelectExisting = (listId: string) => {
    triggerHaptic('selection');
    onSelectList(listId);
  };

  const handleSelectOthers = () => {
    triggerHaptic('selection');
    if (existingOthers) {
      onSelectList(existingOthers.id);
    } else {
      onSelectList(undefined, 'Others');
    }
  };

  const handleSelectUnnamed = () => {
    triggerHaptic('selection');
    if (existingUnnamed) {
      onSelectList(existingUnnamed.id);
    } else {
      onSelectList(undefined, 'Unnamed list');
    }
  };

  const handleCreateNewSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    triggerHaptic('success');
    onSelectList(undefined, trimmed);
    setNewListName('');
    setIsCreatingNew(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-md mx-auto rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${
            isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
          }`}
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pb-1">
            <div
              className={`w-9 h-1 rounded-full ${
                isDark ? 'bg-neutral-800' : 'bg-neutral-300'
              }`}
            />
          </div>

          {/* Minimal Header */}
          <div className="flex items-center justify-between pb-2.5">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight hidden sm:block">
              Select list
            </h3>
            <div className="sm:hidden" />

            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center shrink-0 active:scale-95 transition-all ${
                isDark
                  ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                  : 'bg-[#f0f1f4] text-neutral-600 hover:text-neutral-900'
              }`}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search if more than 3 user lists */}
          {allLists.length > 3 && (
            <div className="my-1.5">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${
                  isDark
                    ? 'bg-[#181818] text-white'
                    : 'bg-[#f0f1f4] text-neutral-900'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your lists..."
                  className="w-full bg-transparent text-xs py-0.5 focus:outline-none placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Lists Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-1 pr-0.5">
            {/* Quick Unnamed / Others Defaults Section */}
            <div className="space-y-1.5">
              {/* Option 1: "Others" */}
              <button
                type="button"
                onClick={handleSelectOthers}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer active:scale-[0.99] ${
                  isDark
                    ? 'bg-[#181818] hover:bg-[#202020]'
                    : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <ListTodo className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold truncate">Others</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Default
                      </span>
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      General &amp; uncategorized tasks
                    </p>
                  </div>
                </div>
                <div
                  className={`text-[11px] font-medium px-2 py-1 rounded-lg ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  Select
                </div>
              </button>

              {/* Option 2: "Unnamed list" */}
              <button
                type="button"
                onClick={handleSelectUnnamed}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer active:scale-[0.99] ${
                  isDark
                    ? 'bg-[#181818] hover:bg-[#202020]'
                    : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <Folder className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-semibold truncate">Unnamed list</span>
                    <p
                      className={`text-[11px] truncate ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Add as an unnamed list
                    </p>
                  </div>
                </div>
                <div
                  className={`text-[11px] font-medium px-2 py-1 rounded-lg ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  Select
                </div>
              </button>
            </div>

            {/* Existing User Lists Section */}
            {filteredUserLists.length > 0 && (
              <div className="pt-2">
                <div className="px-1 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Your Lists
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {filteredUserLists.length} list{filteredUserLists.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {filteredUserLists.map((list) => {
                    const IconComp = getTodoIconComponent(list.todoIcon, list.title);
                    const taskCount = list.todoItems?.length || 0;

                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => handleSelectExisting(list.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer active:scale-[0.99] ${
                          isDark
                            ? 'bg-[#181818] hover:bg-[#202020]'
                            : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            <IconComp className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-semibold truncate block">
                              {list.title || 'Untitled List'}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              {taskCount} item{taskCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${
                            isDark ? 'bg-neutral-800/60 text-neutral-400' : 'bg-neutral-200/60 text-neutral-600'
                          }`}
                        >
                          Select
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inline Create New List Option */}
            <div className="pt-2">
              {!isCreatingNew ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className={`w-full flex items-center gap-2.5 p-3 rounded-2xl transition-all cursor-pointer ${
                    isDark
                      ? 'bg-[#181818] hover:bg-[#202020] text-neutral-300'
                      : 'bg-[#f4f5f8] hover:bg-[#eceef2] text-neutral-700'
                  }`}
                >
                  <FolderPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Create a new list...</span>
                </button>
              ) : (
                <form
                  onSubmit={handleCreateNewSubmit}
                  className={`p-3 rounded-2xl ${
                    isDark ? 'bg-[#181818]' : 'bg-[#f4f5f8]'
                  }`}
                >
                  <div className="text-xs font-semibold text-emerald-500 mb-2">New List Name</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g. Vacation Packing, Books..."
                      className={`flex-1 text-xs sm:text-sm px-3 py-1.5 rounded-xl border focus:outline-none ${
                        isDark
                          ? 'bg-[#121214] border-neutral-700 text-white placeholder:text-neutral-500'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder:text-neutral-400'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newListName.trim()}
                      className="h-8 px-3 rounded-xl bg-emerald-500 text-white text-xs font-medium active:scale-95 disabled:opacity-40"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="h-8 px-2.5 rounded-xl text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
