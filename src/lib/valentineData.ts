import {
  Flower2,
  Gem,
  Cookie,
  Cat,
  Handshake,
  SmilePlus,
  Sparkles,
  Heart,
  LucideIcon
} from 'lucide-react';

export interface DayData {
  id: string;
  name: string;
  dateObj: Date;
  displayDate: string;
  message: string;
  colors: [string, string, string];
  icon: LucideIcon;
  confettiEmoji: string;
  gradient: string;
  audio: string;
}

export const CONFIG = {
  partnerName: "Vandu",
  baseYear: 2026,
  demoMode: false
};

const createDate = (day: number) => new Date(2026, 1, day);

export const WEEK_DATA: DayData[] = [
  {
    id: 'rose',
    name: 'Rose Day',
    dateObj: createDate(7),
    displayDate: 'Feb 7',
    message: "A rose speaks of love silently, in a language known only to the heart.",
    colors: ['#e11d48', '#fda4af', '#881337'],
    icon: Flower2,
    confettiEmoji: '🌹',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #be185d 50%, #881337 100%)',
    // Rose Day
    audio: '/music/PerfectEdSheeran.mp3'
  },
  {
    id: 'propose',
    name: 'Propose Day',
    dateObj: createDate(8),
    displayDate: 'Feb 8',
    message: "It's not about the ring, it's about the promise of forever. Will you be mine?",
    colors: ['#d97706', '#fcd34d', '#78350f'],
    icon: Gem,
    confettiEmoji: '💍',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fcd34d 100%)',
    // Propose Day
    audio: '/music/Dandelionsacoustic.mp3'
  },
  {
    id: 'chocolate',
    name: 'Chocolate Day',
    dateObj: createDate(9),
    displayDate: 'Feb 9',
    message: "Life is like a chocolate box, and you are the sweetest piece in it.",
    colors: ['#78350f', '#d4a373', '#451a03'],
    icon: Cookie,
    confettiEmoji: '🍫',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #d4a373 100%)',
    // Chocolate Day - Assigned Tum Hi Ho
    audio: '/music/Wedonttalkanymore.mp3'
  },
  {
    id: 'teddy',
    name: 'Teddy Day',
    dateObj: createDate(10),
    displayDate: 'Feb 10',
    message: "Soft hugs and warm cuddles. Sending you a bear-y big hug!",
    colors: ['#0ea5e9', '#bae6fd', '#ec4899'],
    icon: Cat,
    confettiEmoji: '🧸',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #bae6fd 100%)',
    // Teddy Day - Assigned Dandelions
    audio: '/music/Fallinginlove.mp3'
  },
  {
    id: 'promise',
    name: 'Promise Day',
    dateObj: createDate(11),
    displayDate: 'Feb 11',
    message: "I promise to walk with you, hold your hand, and never let go.",
    colors: ['#7c3aed', '#ddd6fe', '#4c1d95'],
    icon: Handshake,
    confettiEmoji: '🤝',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
    // Promise Day
    audio: '/music/Ghostjustinbieber.mp3'
  },
  {
    id: 'hug',
    name: 'Hug Day',
    dateObj: createDate(12),
    displayDate: 'Feb 12',
    message: "Sometimes a hug is the only medicine the heart needs.",
    colors: ['#ea580c', '#fdba74', '#c2410c'],
    icon: SmilePlus,
    confettiEmoji: '🫂',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fdba74 100%)',
    // Hug Day
    audio: '/music/PehliNazarMein.mp3'
  },
  {
    id: 'kiss',
    name: 'Kiss Day',
    dateObj: createDate(13),
    displayDate: 'Feb 13',
    message: "A kiss is a lovely trick designed by nature to stop speech when words become superfluous.",
    colors: ['#be123c', '#fecdd3', '#db2777'],
    icon: Sparkles,
    confettiEmoji: '💋',
    gradient: 'linear-gradient(135deg, #db2777 0%, #ec4899 50%, #f472b6 100%)',
    // Kiss Day
    audio: '/music/BabyImyours.mp3'
  },
  {
    id: 'valentine',
    name: "Valentine's Day",
    dateObj: createDate(14),
    displayDate: 'Feb 14',
    message: "In all the world, there is no heart for me like yours. Happy Valentine's Day.",
    colors: ['#dc2626', '#fca5a5', '#991b1b'],
    icon: Heart,
    confettiEmoji: '❤️',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
    // Valentine's Day
    audio: '/music/tumhiho.mp3'
  },
];

export const isFuture = (targetDate: Date): boolean => {
  if (CONFIG.demoMode) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const checkDate = new Date(targetDate);
  checkDate.setFullYear(currentYear);

  now.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate > now;
};

export const getInitialDayIndex = (): number => {
  const now = new Date();
  const todayIndex = WEEK_DATA.findIndex(d =>
    d.dateObj.getDate() === now.getDate() &&
    d.dateObj.getMonth() === now.getMonth()
  );
  return todayIndex !== -1 ? todayIndex : 0;
};
