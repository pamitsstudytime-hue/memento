import {
  ListTodo,
  Gamepad2,
  ShoppingCart,
  Brain,
  Lightbulb,
  Briefcase,
  BookOpen,
  Dumbbell,
  Heart,
  Plane,
  Home,
  Film,
  Music,
  Utensils,
  Coffee,
  Wallet,
  Code,
  Gift,
  PawPrint,
  Car,
  Trophy,
  Star,
  Sparkles,
  Calendar,
  Clock,
  CheckSquare,
  type LucideIcon,
} from 'lucide-react';

export interface TodoIconOption {
  id: string;
  name: string;
  shortLabel: string;
  icon: LucideIcon;
  keywords: string[];
}

export const TODO_ICON_OPTIONS: TodoIconOption[] = [
  {
    id: 'list',
    name: 'Checklist',
    shortLabel: 'Checklist',
    icon: ListTodo,
    keywords: ['task', 'todo', 'list', 'checklist', 'items'],
  },
  {
    id: 'game',
    name: 'Games & Play',
    shortLabel: 'Games',
    icon: Gamepad2,
    keywords: ['game', 'games', 'gaming', 'play', 'match', 'rpg', 'steam', 'quest', 'level', 'ps5', 'xbox', 'nintendo', 'switch', 'gamer'],
  },
  {
    id: 'cart',
    name: 'Shop & Buy',
    shortLabel: 'Buy',
    icon: ShoppingCart,
    keywords: ['buy', 'shop', 'cart', 'grocery', 'groceries', 'market', 'purchase', 'store', 'order', 'shopping', 'supplies'],
  },
  {
    id: 'think',
    name: 'Remember & Think',
    shortLabel: 'Think',
    icon: Brain,
    keywords: ['remember', 'think', 'mind', 'memo', 'memory', 'thought', 'brain', 'forget', 'reminder', 'reminders'],
  },
  {
    id: 'idea',
    name: 'Ideas & Creative',
    shortLabel: 'Ideas',
    icon: Lightbulb,
    keywords: ['idea', 'creative', 'concept', 'plan', 'brainstorm'],
  },
  {
    id: 'work',
    name: 'Work & Projects',
    shortLabel: 'Work',
    icon: Briefcase,
    keywords: ['work', 'office', 'job', 'project', 'client', 'career', 'meeting', 'tasks', 'deadline'],
  },
  {
    id: 'study',
    name: 'Study & Learning',
    shortLabel: 'Study',
    icon: BookOpen,
    keywords: ['study', 'book', 'books', 'read', 'reading', 'school', 'learn', 'exam', 'course', 'homework', 'class', 'college'],
  },
  {
    id: 'fitness',
    name: 'Fitness & Gym',
    shortLabel: 'Fitness',
    icon: Dumbbell,
    keywords: ['gym', 'workout', 'fitness', 'exercise', 'training', 'lift', 'weights', 'cardio', 'run', 'running'],
  },
  {
    id: 'health',
    name: 'Health & Care',
    shortLabel: 'Health',
    icon: Heart,
    keywords: ['health', 'med', 'medicine', 'doctor', 'wellness', 'care', 'clinic', 'dentist', 'pill', 'pills'],
  },
  {
    id: 'travel',
    name: 'Travel & Trips',
    shortLabel: 'Travel',
    icon: Plane,
    keywords: ['travel', 'trip', 'flight', 'pack', 'packing', 'vacation', 'tour', 'holiday', 'hotel', 'flight', 'airport'],
  },
  {
    id: 'home',
    name: 'Home & Chores',
    shortLabel: 'Home',
    icon: Home,
    keywords: ['home', 'house', 'chore', 'chores', 'clean', 'cleaning', 'repair', 'room', 'laundry'],
  },
  {
    id: 'movie',
    name: 'Movies & TV',
    shortLabel: 'Movies',
    icon: Film,
    keywords: ['movie', 'movies', 'film', 'cinema', 'watch', 'series', 'show', 'tv', 'anime', 'episode', 'netflix'],
  },
  {
    id: 'music',
    name: 'Music & Audio',
    shortLabel: 'Music',
    icon: Music,
    keywords: ['music', 'song', 'songs', 'album', 'playlist', 'concert', 'band', 'guitar', 'track', 'audio', 'sound'],
  },
  {
    id: 'food',
    name: 'Food & Cooking',
    shortLabel: 'Food',
    icon: Utensils,
    keywords: ['food', 'cook', 'cooking', 'recipe', 'dinner', 'lunch', 'breakfast', 'eat', 'meal', 'restaurant', 'bake'],
  },
  {
    id: 'coffee',
    name: 'Coffee & Cafe',
    shortLabel: 'Coffee',
    icon: Coffee,
    keywords: ['coffee', 'cafe', 'tea', 'break', 'snack', 'drink', 'beverage', 'starbucks'],
  },
  {
    id: 'finance',
    name: 'Money & Bills',
    shortLabel: 'Money',
    icon: Wallet,
    keywords: ['money', 'bill', 'bills', 'pay', 'payment', 'finance', 'budget', 'salary', 'bank', 'invest', 'tax', 'rent'],
  },
  {
    id: 'code',
    name: 'Coding & Tech',
    shortLabel: 'Code',
    icon: Code,
    keywords: ['code', 'coding', 'dev', 'bug', 'feature', 'tech', 'program', 'git', 'app', 'deploy', 'software'],
  },
  {
    id: 'gift',
    name: 'Gifts & Parties',
    shortLabel: 'Gifts',
    icon: Gift,
    keywords: ['gift', 'present', 'birthday', 'party', 'celebrate', 'anniversary', 'surprise'],
  },
  {
    id: 'pet',
    name: 'Pets & Animals',
    shortLabel: 'Pets',
    icon: PawPrint,
    keywords: ['pet', 'pets', 'dog', 'cat', 'puppy', 'kitten', 'vet', 'animal'],
  },
  {
    id: 'car',
    name: 'Car & Transport',
    shortLabel: 'Car',
    icon: Car,
    keywords: ['car', 'drive', 'auto', 'vehicle', 'gas', 'service', 'parking', 'ride', 'mechanic'],
  },
  {
    id: 'trophy',
    name: 'Goals & Wins',
    shortLabel: 'Goals',
    icon: Trophy,
    keywords: ['goal', 'goals', 'win', 'target', 'challenge', 'achievement', 'trophy', 'milestone', 'resolution'],
  },
  {
    id: 'star',
    name: 'Priority & Focus',
    shortLabel: 'Priority',
    icon: Star,
    keywords: ['priority', 'urgent', 'star', 'important', 'focus', 'critical', 'asap'],
  },
  {
    id: 'calendar',
    name: 'Events & Dates',
    shortLabel: 'Events',
    icon: Calendar,
    keywords: ['event', 'schedule', 'date', 'agenda', 'calendar', 'today'],
  },
  {
    id: 'clock',
    name: 'Routine & Habit',
    shortLabel: 'Routine',
    icon: Clock,
    keywords: ['daily', 'routine', 'time', 'habit', 'habits', 'morning', 'evening', 'night'],
  },
  {
    id: 'checks',
    name: 'Actions & Done',
    shortLabel: 'Done',
    icon: CheckSquare,
    keywords: ['action', 'actions', 'done', 'finish'],
  },
  {
    id: 'sparkles',
    name: 'Special & Fun',
    shortLabel: 'Special',
    icon: Sparkles,
    keywords: ['fun', 'special', 'magic', 'personal', 'wishlist'],
  },
];

export function detectTodoIcon(title?: string): string {
  if (!title) return 'list';
  const lower = title.toLowerCase().trim();
  for (const opt of TODO_ICON_OPTIONS) {
    if (opt.keywords.some((k) => lower.includes(k))) {
      return opt.id;
    }
  }
  return 'list';
}

export function getTodoIconComponent(iconId?: string, title?: string, isTodayList?: boolean): LucideIcon {
  if (isTodayList) return Calendar;
  const targetId = iconId || detectTodoIcon(title);
  const match = TODO_ICON_OPTIONS.find((opt) => opt.id === targetId);
  return match ? match.icon : ListTodo;
}
