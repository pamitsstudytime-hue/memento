import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Highlighter,
  Type,
  Palette,
  Maximize2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ThemeMode, NoteItem, VoiceNoteAttachment } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { formatDiaryHeaderDate, stripHtml, parseNoteDateToISO, formatDateToISO, SHORT_MONTHS } from '../lib/formatters';
import { ImageLightbox } from './ImageLightbox';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

function formatInitialHtml(text: string): string {
  if (!text) return '';
  let converted = text
    .replace(/==([^=]+)==/g, '<mark class="bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium">$1</mark>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*)$/gm, '<li>$1</li>');

  if (/<[a-z][\s\S]*>/i.test(converted)) {
    return converted;
  }
  const paragraphs = converted.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  }
  return converted.replace(/\n/g, '<br/>');
}

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

const CALENDAR_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

const TEXT_COLORS = [
  { name: 'Default', colorHex: null },
  { name: 'Soft Blue', colorHex: '#3b82f6' },
  { name: 'Emerald', colorHex: '#10b981' },
  { name: 'Warm Amber', colorHex: '#f59e0b' },
  { name: 'Rose Red', colorHex: '#f43f5e' },
  { name: 'Purple', colorHex: '#a855f7' },
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
  const [titleError, setTitleError] = useState(false);
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

  // Active formatting state for bold, italic, list, quote, highlight, heading
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    list: false,
    quote: false,
    highlight: false,
    heading: false,
  });

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
  const [calMode, setCalMode] = useState<'days' | 'monthYear'>('days');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const moreFormattingRef = useRef<HTMLDivElement>(null);
  const moodPickerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Floating toolbar & popover states
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState<string | null>(null);
  const [isMoreFormattingOpen, setIsMoreFormattingOpen] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);

  // Sync state when incoming note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setTitleError(false);
      setIsSavedJustNow(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const raw = note.content || '';
      const formatted = formatInitialHtml(raw);
      setContent(formatted);
      if (editorRef.current) {
        editorRef.current.innerHTML = formatted;
      }
      const rawDate = note.todayDate || note.date;
      const noteDate = parseNoteDateToISO(rawDate);
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
      setCalMode('days');
    }
  }, [note, isOpen]);

  // Ensure DOM innerHTML is synced on drawer open
  useEffect(() => {
    if (isOpen && note && editorRef.current) {
      const formatted = formatInitialHtml(note.content || '');
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [isOpen, note]);

  // Clean up audio and timers on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false);
      }
      if (moreFormattingRef.current && !moreFormattingRef.current.contains(target)) {
        setIsMoreFormattingOpen(false);
      }
      if (moodPickerRef.current && !moodPickerRef.current.contains(target)) {
        setIsMoodPickerOpen(false);
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

  // Date breakdown matching editorial header: Day number (4), Day of week (FRI), Month & Year (Sept 2026)
  const parsedDate = useMemo(() => {
    try {
      const iso = parseNoteDateToISO(currentDate);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayNum = d;
      const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = SHORT_MONTHS[dt.getMonth()] || 'Sept';
      const yearMonth = `${monthName} ${dt.getFullYear()}`;
      return { dayNum, weekday, yearMonth };
    } catch {
      const dt = new Date();
      const monthName = SHORT_MONTHS[dt.getMonth()] || 'Sept';
      return {
        dayNum: dt.getDate(),
        weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        yearMonth: `${monthName} ${dt.getFullYear()}`,
      };
    }
  }, [currentDate]);

  // Word count memo from content
  const wordCount = useMemo(() => {
    if (!content) return 0;
    const clean = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  }, [content]);

  // Check if editor content is visually empty
  const isEditorEmpty = useMemo(() => {
    if (!content) return true;
    const clean = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    return clean.length === 0;
  }, [content]);

  // Auto-format markdown when user types:
  // e.g. **text** -> bold
  //      *text*   -> italic
  //      "- "     -> unordered list
  //      "> "     -> blockquote
  const checkAndApplyAutoMarkdown = useCallback((_editor: HTMLDivElement): boolean => {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode) return false;
      const node = sel.anchorNode;
      if (node.nodeType !== Node.TEXT_NODE) return false;

      const text = node.textContent || '';
      const offset = sel.anchorOffset;
      const textBeforeCursor = text.slice(0, offset);

      // 1. Auto-Bold: **text**
      const boldMatch = /(?:^|[^*])\*\*([^*]+)\*\*$/.exec(textBeforeCursor);
      if (boldMatch) {
        const fullMatch = boldMatch[0];
        const boldText = boldMatch[1];
        const matchIndex = boldMatch.index + (fullMatch.startsWith('**') ? 0 : 1);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const strongEl = document.createElement('strong');
          strongEl.textContent = boldText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(strongEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }

      // 2. Auto-Italic: *text* (excluding **)
      const italicMatch = /(?:^|[^*])\*([^*\s][^*]*)\*$/.exec(textBeforeCursor);
      if (italicMatch && !italicMatch[0].includes('**')) {
        const fullMatch = italicMatch[0];
        const italicText = italicMatch[1];
        const matchIndex = italicMatch.index + (fullMatch.startsWith('*') ? 0 : 1);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const emEl = document.createElement('em');
          emEl.textContent = italicText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(emEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }

      // 3. Bullet List: "- " or "* " at start of paragraph
      if (textBeforeCursor === '- ' || textBeforeCursor === '* ') {
        node.textContent = text.slice(2);
        document.execCommand('insertUnorderedList', false);
        return true;
      }

      // 4. Quote: "> " at start of paragraph
      if (textBeforeCursor === '> ') {
        node.textContent = text.slice(2);
        document.execCommand('formatBlock', false, '<blockquote>');
        return true;
      }

      // 5. Highlight: ==text==
      const highlightMatch = /==([^=]+)==$/.exec(textBeforeCursor);
      if (highlightMatch) {
        const fullMatch = highlightMatch[0];
        const hlText = highlightMatch[1];
        const matchIndex = textBeforeCursor.lastIndexOf(fullMatch);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const markEl = document.createElement('mark');
          markEl.className = 'bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium';
          markEl.textContent = hlText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(markEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }
    } catch {
      // Ignore
    }
    return false;
  }, []);

  // Update active state of Bold, Italic, List, Quote, Highlight, Heading based on current selection
  const updateActiveFormats = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      if (editorRef.current && !editorRef.current.contains(sel.anchorNode)) {
        return;
      }

      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const list = document.queryCommandState('insertUnorderedList');

      let quote = false;
      let highlight = false;
      let heading = false;
      let curr: Node | null = sel.anchorNode;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeName === 'BLOCKQUOTE') {
          quote = true;
        } else if (curr.nodeName === 'MARK') {
          highlight = true;
        } else if (curr.nodeName === 'H2' || curr.nodeName === 'H3') {
          heading = true;
        }
        curr = curr.parentNode;
      }

      setActiveFormats({ bold, italic, list, quote, highlight, heading });
    } catch {
      // Ignore
    }
  }, []);

  // Listen to selection changes across the document
  useEffect(() => {
    if (!isOpen) return;
    const handleSelectionChange = () => {
      if (editorRef.current && editorRef.current.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isOpen, updateActiveFormats]);

  // Toggle formatting in editor
  const handleToggleFormatting = (type: 'bold' | 'italic' | 'list' | 'quote') => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (type === 'bold') {
        document.execCommand('bold', false);
      } else if (type === 'italic') {
        document.execCommand('italic', false);
      } else if (type === 'list') {
        document.execCommand('insertUnorderedList', false);
      } else if (type === 'quote') {
        if (activeFormats.quote) {
          document.execCommand('formatBlock', false, '<p>');
        } else {
          document.execCommand('formatBlock', false, '<blockquote>');
        }
      }
      handleEditorInput();
    }
  };

  // Toggle text highlight (pastel yellow marker matching reference image)
  const handleToggleHighlight = () => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        let parent: Node | null = range.commonAncestorContainer;
        let markNode: HTMLElement | null = null;
        while (parent && parent !== editorRef.current) {
          if (parent.nodeName === 'MARK') {
            markNode = parent as HTMLElement;
            break;
          }
          parent = parent.parentNode;
        }
        if (markNode) {
          const text = markNode.textContent || '';
          const textNode = document.createTextNode(text);
          markNode.parentNode?.replaceChild(textNode, markNode);
        } else {
          const mark = document.createElement('mark');
          mark.className = 'bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium';
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
        }
      } else {
        document.execCommand('hiliteColor', false, '#fef08a');
      }
      handleEditorInput();
    }
  };

  // Toggle title/heading 3
  const handleToggleHeading = () => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (activeFormats.heading) {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, '<h3>');
      }
      handleEditorInput();
    }
  };

  // Apply text color (matches the 'A' color tool in reference image)
  const handleApplyTextColor = (colorHex: string | null) => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (!colorHex) {
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, colorHex);
      }
      handleEditorInput();
    }
    setIsColorPickerOpen(false);
  };

  // Handle input in contentEditable editor
  const handleEditorInput = () => {
    if (editorRef.current) {
      checkAndApplyAutoMarkdown(editorRef.current);
      setContent(editorRef.current.innerHTML);
    }
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    updateActiveFormats();
  };

  // Handle paste in contentEditable editor
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && (text.includes('**') || text.includes('*') || text.includes('> ') || text.includes('- '))) {
      e.preventDefault();
      const formatted = formatInitialHtml(text);
      document.execCommand('insertHTML', false, formatted);
      handleEditorInput();
    }
  };

  // Handle keyboard shortcuts (Tab for indentation, Backspace to revert auto-markdown)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      return;
    }

    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode) return;

      const node = sel.anchorNode;
      const offset = sel.anchorOffset;

      let targetStrong: HTMLElement | null = null;
      let targetEm: HTMLElement | null = null;
      let targetMark: HTMLElement | null = null;
      let zeroWidthNode: Node | null = null;

      if (node.nodeType === Node.TEXT_NODE) {
        const textVal = node.textContent || '';
        const isAtStartOrZeroWidth =
          offset === 0 ||
          (offset === 1 && (textVal === '\u200B' || textVal.startsWith('\u200B')));

        if (isAtStartOrZeroWidth) {
          const prev = node.previousSibling;
          if (prev && (prev.nodeName === 'STRONG' || prev.nodeName === 'B')) {
            targetStrong = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          } else if (prev && (prev.nodeName === 'EM' || prev.nodeName === 'I')) {
            targetEm = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          } else if (prev && prev.nodeName === 'MARK') {
            targetMark = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          }
        }

        if (!targetStrong && !targetEm && !targetMark) {
          const parentEl = node.parentElement;
          if (parentEl && (parentEl.nodeName === 'STRONG' || parentEl.nodeName === 'B')) {
            if (offset === textVal.length) {
              targetStrong = parentEl;
            }
          } else if (parentEl && (parentEl.nodeName === 'EM' || parentEl.nodeName === 'I')) {
            if (offset === textVal.length) {
              targetEm = parentEl;
            }
          } else if (parentEl && parentEl.nodeName === 'MARK') {
            if (offset === textVal.length) {
              targetMark = parentEl;
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const prevChild = el.childNodes[offset - 1];
        if (prevChild && (prevChild.nodeName === 'STRONG' || prevChild.nodeName === 'B')) {
          targetStrong = prevChild as HTMLElement;
        } else if (prevChild && (prevChild.nodeName === 'EM' || prevChild.nodeName === 'I')) {
          targetEm = prevChild as HTMLElement;
        } else if (prevChild && prevChild.nodeName === 'MARK') {
          targetMark = prevChild as HTMLElement;
        }
      }

      if (targetStrong) {
        e.preventDefault();
        const boldText = targetStrong.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetStrong.parentNode;
        if (parent) {
          const restored = `**${boldText}*`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetStrong.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetStrong);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }

      if (targetEm) {
        e.preventDefault();
        const italicText = targetEm.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetEm.parentNode;
        if (parent) {
          const restored = `*${italicText}`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetEm.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetEm);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }

      if (targetMark) {
        e.preventDefault();
        const markText = targetMark.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetMark.parentNode;
        if (parent) {
          const restored = `==${markText}=`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetMark.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetMark);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }
    }
  };

  // Save handler: requires title, saves, and closes the drawer
  const handleSave = () => {
    if (!note) return;
    if (!title.trim()) {
      setTitleError(true);
      titleInputRef.current?.focus();
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('medium');
    let finalContent = editorRef.current ? editorRef.current.innerHTML : content;
    if (finalContent) {
      finalContent = finalContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/ style="(?!color:[^"]*)[^"]*"/gi, '');
    }
    const updated: NoteItem = {
      ...note,
      title: title.trim(),
      content: finalContent,
      date: currentDate,
      todayDate: currentDate,
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
    onClose();
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
      setIsSavedJustNow(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setVoiceNotes((prev) => prev.filter((vn) => vn.id !== id));
  };

  // Insert prompt helper
  const handleInsertPrompt = (promptText: string) => {
    triggerHaptic('selection');
    setIsPromptsOpen(false);
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const addition = `<blockquote>✨ <strong>${promptText}</strong></blockquote><p><br/></p>`;
    const next = (content ? content + '<br/>' : '') + addition;
    setContent(next);
    if (editorRef.current) {
      editorRef.current.innerHTML = next;
      editorRef.current.focus();
    }
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
            className={`relative w-full max-w-lg md:max-w-2xl mx-auto rounded-t-[32px] md:rounded-[36px] pt-3 md:pt-6 pb-3 px-5 md:px-8 shadow-2xl flex flex-col h-[94vh] md:h-[90vh] overflow-hidden transition-colors border border-neutral-200/70 dark:border-white/[0.08] ${
              isDark ? 'bg-[#121215] text-white shadow-black/70' : 'bg-[#ffffff] text-neutral-900 shadow-xl'
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

            {/* Header: Clean, borderless, editorial aesthetic (matching reference image) */}
            <div className="flex items-center justify-between pt-1 pb-2 shrink-0 relative z-30">
              {/* Top Left: Editorial Date Header (Day number + Stacked Weekday/YearMonth) + Mood */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Editorial Date Block: Day Number (e.g. 28) + Weekday / Year.Month (e.g. Fri / 2026.8) */}
                <div className="relative shrink-0" ref={calendarPopoverRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      if (!isCalendarOpen) {
                        const iso = parseNoteDateToISO(currentDate);
                        const [y, m, d] = iso.split('-').map(Number);
                        if (!isNaN(y) && !isNaN(m)) {
                          setCalNavDate(new Date(y, m - 1, d || 1));
                        }
                        setCalMode('days');
                      }
                      setIsCalendarOpen((prev) => !prev);
                    }}
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 -ml-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-all text-left cursor-pointer active:scale-98 select-none"
                    title="Change date"
                  >
                    {/* Big Day Number */}
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tighter leading-none text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors font-mono">
                      {parsedDate.dayNum}
                    </span>

                    {/* Stacked Weekday and Year.Month */}
                    <div className="flex flex-col justify-center leading-tight">
                      <span className="text-[11px] sm:text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        {parsedDate.weekday}
                      </span>
                      <span className="text-[11px] sm:text-xs font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                        {parsedDate.yearMonth}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 opacity-60 group-hover:opacity-100 transition-transform duration-200 shrink-0 ${
                        isCalendarOpen ? 'rotate-180 text-purple-500' : ''
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
                        {/* Calendar Header with Month/Year Toggle and Navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setCalMode((m) => (m === 'days' ? 'monthYear' : 'days'));
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg text-sm font-bold tracking-tight transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-900'
                            }`}
                            title={calMode === 'days' ? 'Click to select month or year' : 'Back to calendar days'}
                          >
                            <span>
                              {calNavDate.toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                                calMode === 'monthYear' ? 'rotate-180 text-purple-500' : ''
                              }`}
                            />
                          </button>

                          <div className="flex items-center gap-0.5">
                            {/* Fast Year Back */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                              }`}
                              title="Previous year"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>

                            {/* Month Back (when in days mode) */}
                            {calMode === 'days' && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                                }`}
                                title="Previous month"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}

                            {/* Today button */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setIsSavedJustNow(false);
                                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                const now = new Date();
                                setCalNavDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                setCurrentDate(formatDateToISO(now));
                                setCalMode('days');
                                setIsCalendarOpen(false);
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-purple-400' : 'hover:bg-neutral-100 text-purple-600'
                              }`}
                              title="Jump to today"
                            >
                              Today
                            </button>

                            {/* Month Forward (when in days mode) */}
                            {calMode === 'days' && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                                }`}
                                title="Next month"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}

                            {/* Fast Year Forward */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                              }`}
                              title="Next year"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {calMode === 'monthYear' ? (
                          /* Quick Month & Year Selector View */
                          <div className="py-1">
                            {/* Year Stepper Bar */}
                            <div className="flex items-center justify-between mb-3 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200/50 dark:border-neutral-700/50">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                title="Previous year"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-neutral-400">Year:</span>
                                <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                                  {calNavDate.getFullYear()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                title="Next year"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            {/* 12 Months Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              {CALENDAR_MONTHS.map((mName, mIdx) => {
                                const isCurrentMonth = calNavDate.getMonth() === mIdx;
                                return (
                                  <button
                                    key={`month-picker-${mName}`}
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('selection');
                                      setCalNavDate((prev) => new Date(prev.getFullYear(), mIdx, 1));
                                      setCalMode('days');
                                    }}
                                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                      isCurrentMonth
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : isDark
                                        ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                    }`}
                                  >
                                    {mName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Standard Days Calendar View */
                          <>
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
                                      setIsSavedJustNow(false);
                                      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mood Tag/Picker Pill right by the date */}
                <div className="relative shrink-0" ref={moodPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsMoodPickerOpen((prev) => !prev);
                    }}
                    className={`h-8 px-2.5 sm:px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                      currentMood
                        ? isDark
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 shadow-2xs'
                          : 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 shadow-2xs'
                        : isDark
                        ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200/80'
                    }`}
                    title="Change entry mood"
                  >
                    {currentMood ? (
                      <>
                        <span className="text-sm select-none">{currentMood}</span>
                        <span className="hidden sm:inline-block font-medium">
                          {MOOD_OPTIONS.find((m) => m.emoji === currentMood)?.label || 'Mood'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Smile className="w-3.5 h-3.5 opacity-70" />
                        <span className="hidden sm:inline-block font-medium">Mood</span>
                      </>
                    )}
                  </button>

                  {/* Mood Picker Popover */}
                  <AnimatePresence>
                    {isMoodPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        className={`absolute left-0 top-full mt-2 w-64 p-3 rounded-2xl border shadow-2xl z-50 ${
                          isDark
                            ? 'bg-[#18181c] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-neutral-400">Select Mood</span>
                          {currentMood && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentMood(undefined);
                                setIsMoodPickerOpen(false);
                              }}
                              className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {MOOD_OPTIONS.map((opt) => (
                            <button
                              key={`mood-opt-${opt.label}`}
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                setCurrentMood(opt.emoji);
                                setIsMoodPickerOpen(false);
                              }}
                              className={`p-2 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                                currentMood === opt.emoji
                                  ? isDark
                                    ? 'bg-purple-500/30 ring-2 ring-purple-400 scale-105'
                                    : 'bg-purple-100 ring-2 ring-purple-500 scale-105'
                                  : isDark
                                  ? 'hover:bg-neutral-800'
                                  : 'hover:bg-neutral-100'
                              }`}
                              title={opt.label}
                            >
                              {opt.emoji}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: More menu (...) + Dedicated Save button */}
              <div className="flex items-center gap-2 shrink-0 relative">
                {/* More Menu (...) containing Header Extras */}
                <div ref={moreMenuRef}>
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
                        className={`absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2.5rem)] origin-top-right rounded-2xl border shadow-2xl p-2 z-50 ${
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
                                  setIsSavedJustNow(false);
                                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
                                  setIsSavedJustNow(false);
                                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
                              const fullText = `${title}\n\n${stripHtml(content)}`;
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

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full font-medium text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer select-none shrink-0 ${
                    isSavedJustNow
                      ? isDark
                        ? 'bg-neutral-200 text-neutral-900 font-semibold'
                        : 'bg-neutral-800 text-white font-semibold'
                      : isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-100 shadow-sm'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm'
                  }`}
                >
                  {isSavedJustNow ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
              {/* Title Input (Required, without (optional)) */}
              <div className="flex flex-col gap-1 w-full">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsSavedJustNow(false);
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    if (titleError && e.target.value.trim()) {
                      setTitleError(false);
                    }
                  }}
                  placeholder="Title..."
                  required
                  className={`text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-b outline-hidden w-full transition-colors pb-1 ${
                    titleError
                      ? 'border-rose-500 placeholder:text-rose-400'
                      : 'border-transparent'
                  } ${
                    isDark
                      ? 'text-white placeholder:text-neutral-600'
                      : 'text-neutral-900 placeholder:text-neutral-400'
                  }`}
                />
                {titleError && (
                  <span className="text-xs text-rose-500 font-medium">Title is required</span>
                )}
              </div>

              {/* Attached Photos (with gorgeous rounded corners matching Image 2 reference) */}
              {images.length > 0 && (
                <div className="my-2 space-y-2">
                  {images.length === 1 ? (
                    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-neutral-200/80 dark:border-white/10 shadow-sm sm:shadow-md group bg-neutral-900/5 dark:bg-neutral-900/50">
                      <img
                        src={images[0]}
                        alt="Diary visual memory"
                        onClick={() => setLightboxSrc(images[0])}
                        className="w-full max-h-[360px] sm:max-h-[440px] object-cover cursor-pointer transition-transform duration-500 group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                      {/* Floating actions on photo */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(images[0])}
                          className="w-8 h-8 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-md"
                          title="View full size"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(0);
                          }}
                          className="w-8 h-8 rounded-full bg-black/65 hover:bg-rose-600 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-md"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {images.map((imgSrc, idx) => (
                        <div
                          key={`attached-img-${idx}`}
                          className="relative aspect-4/3 rounded-2xl sm:rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10 shadow-xs group bg-neutral-900/5 dark:bg-neutral-900/50"
                        >
                          <img
                            src={imgSrc}
                            alt={`Attachment ${idx + 1}`}
                            onClick={() => setLightboxSrc(imgSrc)}
                            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(idx);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Main Journal Writing Canvas with Auto-Markdown */}
              <div className="relative flex-1 min-h-[280px] flex flex-col pt-1">
                {isEditorEmpty && (
                  <div
                    onClick={() => editorRef.current?.focus()}
                    className={`absolute inset-0 pointer-events-none text-base sm:text-lg leading-relaxed font-normal select-none ${
                      isDark ? 'text-neutral-600' : 'text-neutral-400'
                    }`}
                  >
                    Dear Diary, write your thoughts, memories, reflections, or moments here...
                  </div>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onPaste={handleEditorPaste}
                  onKeyDown={handleEditorKeyDown}
                  onSelect={updateActiveFormats}
                  onKeyUp={updateActiveFormats}
                  onMouseUp={updateActiveFormats}
                  className={`w-full flex-1 bg-transparent border-none outline-hidden resize-none text-base sm:text-lg leading-relaxed font-normal transition-colors focus:outline-none min-h-[260px] ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                  style={{ minHeight: '260px' }}
                />
              </div>
            </div>

            {/* BOTTOM FLOATING EDITORIAL TOOLBAR (Matching Reference Image 2: T, 🖼️, ✏️, B, A) */}
            <footer className="pt-2 pb-2 shrink-0 z-30 relative">
              <div className="w-full flex items-center justify-center relative">
                {/* Floating Docked Pill Toolbar */}
                <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/95 dark:bg-[#1c1c22]/95 backdrop-blur-lg border border-neutral-200/90 dark:border-white/10 shadow-xl shadow-black/8 dark:shadow-black/50">
                  {/* 1. T - Typography / Heading Toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleHeading();
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                      activeFormats.heading
                        ? isDark
                          ? 'bg-neutral-700 text-white ring-1 ring-neutral-600'
                          : 'bg-neutral-200 text-neutral-900 ring-1 ring-neutral-300'
                        : isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                    title="Title / Subheading (T)"
                  >
                    <span className="font-bold text-sm leading-none">T</span>
                  </button>

                  {/* 2. Photo / Image Upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      images.length > 0
                        ? 'text-purple-500 hover:bg-purple-500/10'
                        : isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                    title="Add photo (with rounded corners)"
                  >
                    <ImageIcon className="w-4 h-4 stroke-[2]" />
                  </button>

                  {/* 3. Highlighter - Soft Warm Yellow Marker */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleHighlight();
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeFormats.highlight
                        ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-400/50 shadow-xs'
                        : isDark
                        ? 'text-amber-400 hover:bg-amber-400/15'
                        : 'text-amber-600 hover:bg-amber-100/70'
                    }`}
                    title="Highlight text"
                  >
                    <Highlighter className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  {/* 4. B - Bold Toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleFormatting('bold');
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                      activeFormats.bold
                        ? isDark
                          ? 'bg-neutral-700 text-white ring-1 ring-neutral-600'
                          : 'bg-neutral-200 text-neutral-900 ring-1 ring-neutral-300'
                        : isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                    title="Bold (**text**)"
                  >
                    <Bold className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* 5. A - Color Selector Popover */}
                  <div className="relative" ref={colorPickerRef}>
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen((prev) => !prev)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isColorPickerOpen
                          ? isDark
                            ? 'bg-neutral-700 text-white'
                            : 'bg-neutral-200 text-neutral-900'
                          : isDark
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                      title="Text color (A)"
                    >
                      <span className="font-extrabold text-sm leading-none">A</span>
                      <span
                        className="w-3.5 h-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: selectedTextColor || '#3b82f6' }}
                      />
                    </button>

                    {/* Color Swatches Popover */}
                    <AnimatePresence>
                      {isColorPickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2 rounded-2xl border shadow-2xl flex items-center gap-1.5 z-50 ${
                            isDark
                              ? 'bg-[#1a1a1f] border-neutral-800 text-white shadow-black/80'
                              : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                          }`}
                        >
                          {TEXT_COLORS.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedTextColor(c.colorHex);
                                handleApplyTextColor(c.colorHex);
                              }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-115 cursor-pointer ${
                                c.colorHex === null ? 'border border-neutral-400' : 'shadow-xs'
                              }`}
                              style={{ backgroundColor: c.colorHex || 'transparent' }}
                              title={c.name}
                            >
                              {c.colorHex === null && (
                                <span className="text-[10px] font-bold text-neutral-500">✕</span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />

                  {/* More Formatting Tools (Italic, List, Quote, Voice Memo) */}
                  <div className="relative" ref={moreFormattingRef}>
                    <button
                      type="button"
                      onClick={() => setIsMoreFormattingOpen((prev) => !prev)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isMoreFormattingOpen
                          ? isDark
                            ? 'bg-neutral-700 text-white'
                            : 'bg-neutral-200 text-neutral-900'
                          : isDark
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                      title="More formatting tools"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {isMoreFormattingOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className={`absolute bottom-full mb-3 right-0 p-1.5 rounded-2xl border shadow-2xl flex items-center gap-1 z-50 ${
                            isDark
                              ? 'bg-[#1a1a1f] border-neutral-800 text-white shadow-black/80'
                              : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                          }`}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('italic');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.italic
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Italic (*text*)"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('list');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.list
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Bullet List (- item)"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('quote');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.quote
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Quote (> quote)"
                          >
                            <Quote className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleRecord();
                              setIsMoreFormattingOpen(false);
                            }}
                            className="p-2 rounded-xl text-purple-400 hover:bg-purple-500/15 transition-colors cursor-pointer"
                            title="Record Voice Note"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Word Count (Minimalist, placed at bottom right matching Image 2) */}
                <div className="absolute right-3 sm:right-5 text-xs font-medium text-neutral-400 select-none">
                  {wordCount > 0 ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'}` : ''}
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
