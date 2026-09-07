import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Mic,
  Smile,
  Sparkles,
  Save,
  Check,
  MoreHorizontal,
  Bookmark,
  Copy,
  Trash2,
  Play,
  Pause,
  X,
  Plus,
  Bold,
  Italic,
  List,
  Quote,
  Clock,
} from 'lucide-react';
import { ThemeMode, NoteItem, VoiceNoteAttachment } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { formatDiaryHeaderDate } from '../lib/formatters';
import { ImageLightbox } from './ImageLightbox';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

const MOOD_OPTIONS = [
  { emoji: '✨', label: 'Grateful' },
  { emoji: '😌', label: 'Peaceful' },
  { emoji: '😊', label: 'Joyful' },
  { emoji: '💡', label: 'Inspired' },
  { emoji: '🌿', label: 'Calm' },
  { emoji: '⚡', label: 'Energetic' },
  { emoji: '💭', label: 'Reflective' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🌧️', label: 'Melancholy' },
];

const JOURNALING_PROMPTS = [
  'What made you smile or feel genuinely at peace today?',
  'What was the biggest highlight or accomplishment of your day?',
  'Name one thing you learned about yourself or others today.',
  'What challenge did you encounter, and how did you navigate it?',
  'List three things you feel deeply grateful for right now.',
  'If today was a chapter in a book, what would its title be?',
  'What is something you want to let go of before you sleep?',
];

function createSampleAudioBlob(): Blob {
  const sampleRate = 44100;
  const duration = 2.5;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 460 + Math.sin(t * 8) * 90;
    const decay = Math.exp(-t * 0.9);
    const sample = Math.sin(2 * Math.PI * freq * t) * decay * 0.35;
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DiaryDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
}

export function DiaryDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onDelete,
  onToggleFavorite,
  onUpdateNote,
}: DiaryDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const keyboardOffset = useKeyboardOffset();

  // Form states initialized from note
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentDate, setCurrentDate] = useState(() => formatDateToISO(new Date()));
  const [currentMood, setCurrentMood] = useState<string | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteAttachment[]>([]);

  // UI state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSavedJustNow, setIsSavedJustNow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Audio state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // Calendar popover navigation state
  const [calNavDate, setCalNavDate] = useState(() => new Date());

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Sync state when incoming note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      const noteDate =
        note.date && /^\d{4}-\d{2}-\d{2}$/.test(note.date)
          ? note.date
          : formatDateToISO(new Date(note.date || Date.now()));
      setCurrentDate(noteDate);
      setCurrentMood(note.mood);

      const imgs =
        note.images && note.images.length > 0
          ? note.images
          : note.imageUrl
          ? [note.imageUrl]
          : [];
      setImages(imgs);

      const vns =
        note.voiceNotes && note.voiceNotes.length > 0
          ? note.voiceNotes
          : note.voiceAudioUrl || note.hasVoiceNote
          ? [
              {
                id: 'vn-main',
                audioUrl: note.voiceAudioUrl || '',
                duration: note.voiceDuration || '0:15',
                name: 'Voice Note',
              },
            ]
          : [];
      setVoiceNotes(vns);

      // Parse date for calendar nav
      try {
        const [y, m] = noteDate.split('-').map(Number);
        setCalNavDate(new Date(y, m - 1, 1));
      } catch {
        setCalNavDate(new Date());
      }
    }
  }, [note, isOpen]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(target)) {
        setIsCalendarOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Calendar month days calculation (Hook must be called unconditionally)
  const calendarDays = useMemo(() => {
    const year = calNavDate.getFullYear();
    const month = calNavDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Monday as 0: (day + 6) % 7
    const startingOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dNum);
      cells.push({
        dateStr: formatDateToISO(prevDate),
        dayNum: dNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      cells.push({
        dateStr: formatDateToISO(curDate),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Trailing days
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      cells.push({
        dateStr: formatDateToISO(nextDate),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [calNavDate]);

  // Format header date strictly as e.g. "7 Sept 2026"
  const headerDateString = formatDiaryHeaderDate(currentDate);

  // Writing metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  // Save handler
  const handleSave = () => {
    if (!note) return;
    triggerHaptic('medium');
    const updated: NoteItem = {
      ...note,
      title: title.trim() || 'Untitled Reflection',
      content,
      date: currentDate,
      mood: currentMood,
      images,
      voiceNotes,
      hasVoiceNote: voiceNotes.length > 0,
      voiceAudioUrl: voiceNotes[0]?.audioUrl,
      voiceDuration: voiceNotes[0]?.duration,
      imageUrl: images[0],
      isDiary: true,
      entryType: 'diary',
    };

    onUpdateNote?.(updated);
    setIsSavedJustNow(true);
    setTimeout(() => setIsSavedJustNow(false), 1800);
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    triggerHaptic('light');
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    triggerHaptic('light');
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Voice recording toggle
  const handleToggleRecord = () => {
    triggerHaptic('medium');
    if (!isRecording) {
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      // Finish recording
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      const minutes = Math.floor(recordDuration / 60);
      const seconds = recordDuration % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const audioBlob = createSampleAudioBlob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const newVN: VoiceNoteAttachment = {
        id: `vn-${Date.now()}`,
        audioUrl,
        duration: formattedDuration === '0:00' ? '0:05' : formattedDuration,
        name: `Reflection Voice Note`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setVoiceNotes((prev) => [...prev, newVN]);
    }
  };

  // Play voice note
  const togglePlayVoiceNote = (vn: VoiceNoteAttachment) => {
    if (activePlayingId === vn.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => {
            setActivePlayingId(vn.id);
            triggerHaptic('selection');
          })
          .catch((err) => console.warn(err));
      } else {
        audioRef.current.pause();
        setActivePlayingId(null);
        triggerHaptic('selection');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const url = vn.audioUrl || URL.createObjectURL(createSampleAudioBlob());
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      setActivePlayingId(null);
      setPlaybackTime(0);
    };

    audio
      .play()
      .then(() => {
        setActivePlayingId(vn.id);
        triggerHaptic('selection');
      })
      .catch((err) => console.warn(err));
  };

  // Remove voice note
  const handleRemoveVoiceNote = (id: string) => {
    triggerHaptic('light');
    setVoiceNotes((prev) => prev.filter((vn) => vn.id !== id));
  };

  // Formatting insert helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    triggerHaptic('light');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4)
      );
    }, 10);
  };

  // Insert prompt helper
  const handleInsertPrompt = (promptText: string) => {
    triggerHaptic('selection');
    setIsPromptsOpen(false);
    const addition = content.trim()
      ? `\n\n> ✨ **${promptText}**\n\n`
      : `> ✨ **${promptText}**\n\n`;
    setContent((prev) => prev + addition);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  return (
    <AnimatePresence>
      {isOpen && note && (
        <div
          style={{
            paddingBottom: !isDesktop && keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
            transition: 'padding-bottom 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto"
        >
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

          {/* Drawer / Modal Sheet matching default app theme (full-length drawer) */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
            }
            className={`relative w-full max-w-lg md:max-w-2xl mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-5 pb-4 px-5 md:px-7 shadow-2xl flex flex-col h-[94vh] md:h-[88vh] overflow-hidden transition-colors ${
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

            {/* Hidden Photo File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Header: Clean, borderless, matching default app theme (NO SPLIT LINES) */}
            <div className="flex items-center justify-between py-1.5 shrink-0 relative z-30">
              {/* Top Left: Close Button + Single-line Elegant Date Button */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onClose();
                  }}
                  aria-label="Close"
                  className={`p-2 -ml-1 rounded-full transition-colors active:scale-95 cursor-pointer shrink-0 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Date in format "7 Sept 2026" / "4 Sept 2001", clean single line badge, clicking opens calendar */}
                <div className="relative shrink-0" ref={calendarPopoverRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setIsCalendarOpen((prev) => !prev);
                    }}
                    className={`h-8 sm:h-9 px-3 rounded-full inline-flex items-center gap-2 text-xs sm:text-sm font-medium tracking-tight whitespace-nowrap transition-all active:scale-95 cursor-pointer select-none shrink-0 ${
                      isDark
                        ? 'bg-[#1e1e22] hover:bg-[#28282e] text-neutral-200'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800'
                    }`}
                    title="Change date"
                  >
                    <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    <span className="whitespace-nowrap font-medium text-inherit">{headerDateString}</span>
                    {currentMood && (
                      <span className="text-sm select-none shrink-0" title={`Mood: ${currentMood}`}>
                        {currentMood}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0 ${
                        isCalendarOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Calendar Popover */}
                  <AnimatePresence>
                    {isCalendarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-4 z-50 transition-colors ${
                          isDark
                            ? 'bg-[#18181b] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        {/* Calendar Month Navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold tracking-tight">
                            {calNavDate.toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </h4>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                const now = new Date();
                                setCalNavDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                setCurrentDate(formatDateToISO(now));
                                setIsCalendarOpen(false);
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-purple-400' : 'hover:bg-neutral-100 text-purple-600'
                              }`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-neutral-400 mb-2">
                          <span>M</span>
                          <span>T</span>
                          <span>W</span>
                          <span>T</span>
                          <span>F</span>
                          <span>S</span>
                          <span>S</span>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((cell, idx) => {
                            const isSelected = cell.dateStr === currentDate;
                            const isToday = cell.dateStr === formatDateToISO(new Date());

                            return (
                              <button
                                key={`cal-day-${idx}-${cell.dateStr}`}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setCurrentDate(cell.dateStr);
                                  setIsCalendarOpen(false);
                                }}
                                className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : isToday
                                    ? isDark
                                      ? 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10'
                                      : 'border border-purple-400 text-purple-700 hover:bg-purple-50'
                                    : cell.isCurrentMonth
                                    ? isDark
                                      ? 'hover:bg-neutral-800 text-neutral-200'
                                      : 'hover:bg-neutral-100 text-neutral-800'
                                    : isDark
                                    ? 'text-neutral-600 hover:bg-neutral-800/40'
                                    : 'text-neutral-400 hover:bg-neutral-100/50'
                                }`}
                              >
                                {cell.dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: More menu (...) with Header Extras + Dedicated Save button */}
              <div className="flex items-center gap-2 shrink-0">
                {/* More Menu (...) containing Header Extras */}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsMoreMenuOpen((prev) => !prev);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                      isMoreMenuOpen
                        ? isDark
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-200 text-neutral-900'
                        : isDark
                        ? 'bg-[#1e1e22] hover:bg-[#28282e] text-neutral-300'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {isMoreMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className={`absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl p-2 z-50 ${
                          isDark
                            ? 'bg-[#18181b] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        {/* Section 1: Mood Selector */}
                        <div className="px-2 pt-1 pb-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            <span>Mood</span>
                            {currentMood && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCurrentMood(undefined);
                                }}
                                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors lowercase cursor-pointer"
                              >
                                clear
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {MOOD_OPTIONS.map((opt) => (
                              <button
                                key={`more-mood-${opt.label}`}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setCurrentMood(currentMood === opt.emoji ? undefined : opt.emoji);
                                }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                                  currentMood === opt.emoji
                                    ? 'bg-purple-600/30 ring-2 ring-purple-500 scale-105'
                                    : isDark
                                    ? 'bg-[#222226] hover:bg-[#2c2c32]'
                                    : 'bg-neutral-100 hover:bg-neutral-200'
                                }`}
                                title={opt.label}
                              >
                                {opt.emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Header Extras */}
                        <div className="space-y-0.5 pt-1">
                          {/* Attach Photos */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              fileInputRef.current?.click();
                              setIsMoreMenuOpen(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <ImageIcon className="w-4 h-4 text-purple-400 stroke-[2]" />
                            <span>Attach Photos {images.length > 0 ? `(${images.length})` : ''}</span>
                          </button>

                          {/* Record Voice Note */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              handleToggleRecord();
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Mic className={`w-4 h-4 stroke-[2] ${isRecording ? 'text-rose-500 animate-pulse' : 'text-rose-400'}`} />
                            <span>{isRecording ? 'Stop Recording' : 'Record Voice Memo'}</span>
                          </button>

                          {/* Reflection Prompts */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setIsMoreMenuOpen(false);
                              setIsPromptsOpen(true);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                            <span>Journaling Prompts</span>
                          </button>
                        </div>

                        {/* Subtle Divider */}
                        <div className={`my-1.5 h-px ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`} />

                        {/* Section 3: Note Actions */}
                        <div className="space-y-0.5">
                          {onToggleFavorite && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onToggleFavorite(note.id);
                                setIsMoreMenuOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              <Bookmark
                                className={`w-4 h-4 stroke-[2] ${
                                  note.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'
                                }`}
                              />
                              <span>{note.isFavorite ? 'Remove from Fav' : 'Add to Fav'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              const fullText = `${title}\n\n${content}`;
                              navigator.clipboard?.writeText(fullText);
                              setCopied(true);
                              setIsMoreMenuOpen(false);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                            ) : (
                              <Copy className="w-4 h-4 text-neutral-400 stroke-[2]" />
                            )}
                            <span>{copied ? 'Copied!' : 'Copy Content'}</span>
                          </button>

                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                onDelete(note.id);
                                setIsMoreMenuOpen(false);
                                onClose();
                              }}
                              className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2]" />
                              <span>Delete Entry</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Most Right Save Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer select-none shrink-0 ${
                    isSavedJustNow
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isSavedJustNow ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Recording Banner */}
            {isRecording && (
              <div className="my-2 bg-rose-500/10 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-semibold text-rose-400">
                    Recording Voice Note... ({Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                >
                  Stop & Save
                </button>
              </div>
            )}

            {/* INSIDE IT THERE WILL BE DIARY: Pure, distraction-free writing canvas */}
            <div className="flex-1 overflow-y-auto no-scrollbar w-full pt-3 pb-2 flex flex-col gap-3">
              {/* Title Input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)..."
                className={`text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-none outline-hidden w-full transition-colors ${
                  isDark
                    ? 'text-white placeholder:text-neutral-600'
                    : 'text-neutral-900 placeholder:text-neutral-400'
                }`}
              />

              {/* Attached Photos Strip (if any) */}
              {images.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {images.map((imgSrc, idx) => (
                      <div
                        key={`attached-img-${idx}`}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden group shadow-xs cursor-pointer bg-neutral-900"
                        onClick={() => setLightboxSrc(imgSrc)}
                      >
                        <img
                          src={imgSrc}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(idx);
                          }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                        isDark
                          ? 'border-neutral-800 hover:border-purple-500/50 text-neutral-500 hover:text-purple-400'
                          : 'border-neutral-300 hover:border-purple-500/50 text-neutral-400 hover:text-purple-600'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2]" />
                      <span className="text-[10px] font-medium">Add photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Notes Strip (if any) */}
              {voiceNotes.length > 0 && (
                <div className="space-y-2">
                  {voiceNotes.map((vn, idx) => {
                    const isThisPlaying = activePlayingId === vn.id;
                    return (
                      <div
                        key={vn.id || `vn-${idx}`}
                        className={`p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                          isDark
                            ? 'bg-[#18181c] text-white'
                            : 'bg-purple-50/70 text-neutral-900 shadow-xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => togglePlayVoiceNote(vn)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer ${
                            isThisPlaying
                              ? 'bg-purple-600 text-white shadow-purple-500/25 shadow-md'
                              : isDark
                              ? 'bg-[#26262b] hover:bg-[#303036] text-purple-300'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          }`}
                          title={isThisPlaying ? 'Pause' : 'Play'}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold tracking-tight truncate flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{vn.name || `Voice Note ${idx + 1}`}</span>
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                              {isThisPlaying
                                ? `${Math.floor(playbackTime / 60)}:${(playbackTime % 60).toString().padStart(2, '0')}`
                                : vn.duration || '0:15'}
                            </span>
                          </div>

                          {/* Visual Waveform */}
                          <div className="flex items-center gap-1 h-2">
                            {[40, 75, 100, 60, 30, 85, 95, 50, 70, 40, 90, 60, 35, 80, 100, 65, 45, 85].map(
                              (hPercent, barIdx) => (
                                <div
                                  key={`wave-${idx}-${barIdx}`}
                                  className={`flex-1 rounded-full transition-all duration-150 ${
                                    isThisPlaying
                                      ? 'bg-purple-500'
                                      : isDark
                                      ? 'bg-neutral-700'
                                      : 'bg-purple-300'
                                  }`}
                                  style={{
                                    height: isThisPlaying
                                      ? `${Math.max(
                                          25,
                                          Math.min(
                                            100,
                                            hPercent *
                                              (0.35 +
                                                Math.abs(Math.sin(barIdx * 0.8 + playbackTime * 4)) * 0.7)
                                          )
                                        )}%`
                                      : `${Math.max(25, hPercent * 0.45)}%`,
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVoiceNote(vn.id)}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete voice note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Main Journal Writing Textarea */}
              <div className="relative flex-1 min-h-[280px] flex flex-col pt-1">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Dear Diary, write your thoughts, memories, reflections, or moments here..."
                  className={`w-full flex-1 bg-transparent border-none outline-hidden resize-none text-base sm:text-lg leading-relaxed font-normal transition-colors ${
                    isDark
                      ? 'text-neutral-200 placeholder:text-neutral-600'
                      : 'text-neutral-800 placeholder:text-neutral-400'
                  }`}
                  style={{ minHeight: '260px' }}
                />
              </div>
            </div>

            {/* BOTTOM STATS & FORMATTING BAR (NO SPLIT LINES) */}
            <footer className="bg-inherit pt-2 pb-1 shrink-0 z-20">
              <div className="w-full flex items-center justify-between text-xs text-neutral-400">
                {/* Quick Format Tools */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                    title="Bullet List"
                  >
                    <List className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                    title="Quote"
                  >
                    <Quote className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Word & Reading Time Metrics */}
                <div className="flex items-center gap-2.5 font-mono text-[11px] text-neutral-400 select-none">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-400 stroke-[2]" />
                    <span>{readingTime} min read</span>
                  </span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                </div>
              </div>
            </footer>

            {/* Reflection Prompts Modal */}
            <AnimatePresence>
              {isPromptsOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsPromptsOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-4 z-10 ${
                      isDark
                        ? 'bg-[#18181b] border-neutral-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold tracking-tight">Journaling Prompts</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPromptsOpen(false)}
                        className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                      {JOURNALING_PROMPTS.map((pr, idx) => (
                        <button
                          key={`prompt-modal-${idx}`}
                          type="button"
                          onClick={() => handleInsertPrompt(pr)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors leading-relaxed cursor-pointer ${
                            isDark
                              ? 'hover:bg-neutral-800/90 text-neutral-200 hover:text-white bg-neutral-900/50'
                              : 'hover:bg-neutral-100 text-neutral-800 bg-neutral-50'
                          }`}
                        >
                          "{pr}"
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Image Lightbox */}
            <ImageLightbox
              isOpen={!!lightboxSrc}
              src={lightboxSrc}
              alt="Diary memory"
              onClose={() => setLightboxSrc(null)}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
