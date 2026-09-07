import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  BookOpen,
  Bookmark,
  Calendar,
  Clock,
  ImageIcon,
  Mic,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { triggerHaptic } from '../lib/capacitor';
import { stripHtml } from '../lib/formatters';

interface DiaryDayDrawerProps {
  isOpen: boolean;
  dateStr: string | null;
  todayStr: string;
  theme: ThemeMode;
  entries: NoteItem[];
  onClose: () => void;
  onSelectNote: (note: NoteItem) => void;
  onOpenNewNote: (dateStr: string) => void;
  onToggleFavorite?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
}

function getFormattedDayHeader(dateStr: string, todayStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let title = target.toLocaleDateString('en-US', { weekday: 'long' });
  let isToday = false;

  if (diffDays === 0) {
    title = 'Today';
    isToday = true;
  } else if (diffDays === 1) {
    title = 'Tomorrow';
  } else if (diffDays === -1) {
    title = 'Yesterday';
  }

  const fullDate = target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { title, fullDate, isToday };
}

export const DiaryDayDrawer: React.FC<DiaryDayDrawerProps> = ({
  isOpen,
  dateStr,
  todayStr,
  theme,
  entries,
  onClose,
  onSelectNote,
  onOpenNewNote,
  onToggleFavorite,
  onDeleteNote,
}) => {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();

  const { title, fullDate, isToday } = dateStr
    ? getFormattedDayHeader(dateStr, todayStr)
    : { title: '', fullDate: '', isToday: false };

  return (
    <AnimatePresence>
      {isOpen && dateStr && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop matching default app theme */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Drawer / Modal Sheet matching default app theme (borderless, clean surface) */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
            }
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[82vh] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top Drag Handle for mobile */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Clean, borderless, matching default app theme */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isToday
                      ? isDark
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-purple-100 text-purple-700'
                      : isDark
                      ? 'bg-purple-500/15 text-purple-400'
                      : 'bg-purple-50 text-purple-600'
                  }`}
                >
                  <Calendar className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      className={`text-lg font-bold tracking-tight truncate leading-tight ${
                        isToday
                          ? isDark
                            ? 'text-purple-400'
                            : 'text-purple-600'
                          : isDark
                          ? 'text-white'
                          : 'text-neutral-900'
                      }`}
                    >
                      {title}
                    </h2>
                    {entries.length > 0 && (
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                          isDark
                            ? 'bg-[#1e1e1e] text-neutral-400'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {fullDate}
                  </p>
                </div>
              </div>

              {/* Close Button matching default app theme */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body - NO split lines anywhere */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-3 my-1">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                      isDark
                        ? 'bg-purple-500/15 text-purple-400'
                        : 'bg-purple-50 text-purple-600'
                    }`}
                  >
                    <BookOpen className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">
                    No reflections for this day
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-5">
                    Record your thoughts, memories, or moments that occurred on this day.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      onClose();
                      onOpenNewNote(dateStr);
                    }}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Write Entry</span>
                  </button>
                </div>
              ) : (
                entries.map((item) => {
                  const hasPhotos = (item.images && item.images.length > 0) || !!item.imageUrl;
                  const hasVoice = (item.voiceNotes && item.voiceNotes.length > 0) || !!item.hasVoiceNote;
                  const plainText = stripHtml(item.content);
                  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
                  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

                  return (
                    <div
                      key={`day-drawer-entry-${item.id}`}
                      onClick={() => {
                        triggerHaptic('light');
                        onClose();
                        onSelectNote(item);
                      }}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                        isDark
                          ? 'bg-[#18181c] hover:bg-[#202024] border-neutral-800/80 hover:border-neutral-700 shadow-xs'
                          : 'bg-neutral-50/90 hover:bg-neutral-100 border-neutral-200/90 hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.mood && (
                            <span className="text-sm shrink-0 select-none">
                              {item.mood}
                            </span>
                          )}
                          <h4
                            className={`text-sm font-bold truncate ${
                              isDark ? 'text-neutral-100' : 'text-neutral-900'
                            }`}
                          >
                            {item.title || 'Untitled Reflection'}
                          </h4>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onToggleFavorite(item.id);
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                item.isFavorite
                                  ? isDark
                                    ? 'text-purple-400'
                                    : 'text-purple-600'
                                  : isDark
                                  ? 'text-neutral-500 hover:text-neutral-300'
                                  : 'text-neutral-400 hover:text-neutral-700'
                              }`}
                            >
                              <Bookmark
                                className="w-3.5 h-3.5"
                                fill={item.isFavorite ? 'currentColor' : 'none'}
                              />
                            </button>
                          )}

                          {onDeleteNote && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                onDeleteNote(item.id);
                              }}
                              className="p-1 rounded-full text-neutral-400 hover:text-rose-500 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.content && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2.5">
                          {stripHtml(item.content)}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 stroke-[2]" />
                            <span>{readingTime} min read</span>
                          </span>

                          {hasPhotos && (
                            <span className="flex items-center gap-1 text-purple-400 font-medium">
                              <ImageIcon className="w-3 h-3" />
                              <span>Photo</span>
                            </span>
                          )}

                          {hasVoice && (
                            <span className="flex items-center gap-1 text-purple-400 font-medium">
                              <Mic className="w-3 h-3" />
                              <span>Voice</span>
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Add Entry Button (NO split line) */}
            {entries.length > 0 && (
              <div className="pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onClose();
                    onOpenNewNote(dateStr);
                  }}
                  className="w-full py-2.5 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.2]" />
                  <span>Write New Entry for {title}</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
