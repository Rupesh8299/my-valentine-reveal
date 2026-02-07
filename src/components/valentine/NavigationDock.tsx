import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { WEEK_DATA } from '@/lib/valentineData';
import { toast } from 'sonner';

interface NavigationDockProps {
  currentIndex: number;
  setIndex: (index: number) => void;
  lockedIndices: number[];
}

const NavigationDock = ({ currentIndex, setIndex, lockedIndices }: NavigationDockProps) => {
  const handleDayClick = (idx: number) => {
    const day = WEEK_DATA[idx];
    if (lockedIndices.includes(idx)) {
      toast.error(`Patience, my love! 🔒`, {
        description: `${day.name} unlocks on ${day.displayDate}`,
        duration: 2000,
      });
      return;
    }
    setIndex(idx);
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 150, damping: 20 }}
      className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-40 px-2 py-2 md:px-5 md:py-3 rounded-2xl glass-card-strong flex gap-1.5 sm:gap-3 items-center w-max max-w-[92vw] overflow-x-auto no-scrollbar pb-safe"
    >
      {WEEK_DATA.map((day, idx) => {
        const isActive = idx === currentIndex;
        const isLocked = lockedIndices.includes(idx);
        const Icon = isLocked ? Lock : day.icon;
        
        return (
          <motion.button
            key={day.id}
            onClick={() => handleDayClick(idx)}
            whileHover={!isLocked ? { scale: 1.1 } : { scale: 1 }}
            whileTap={!isLocked ? { scale: 0.95 } : { scale: 1 }}
            className={`relative group flex flex-col items-center justify-center outline-none shrink-0 ${
              isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
            }`}
          >
            {/* Active glow */}
            {isActive && (
              <motion.div
                layoutId="navGlow"
                className="absolute inset-0 rounded-full blur-xl opacity-50"
                style={{ backgroundColor: day.colors[0] }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            <motion.div
              animate={{ 
                scale: isActive ? 1 : 0.9,
                backgroundColor: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
              }}
              className="relative p-2.5 md:p-3 rounded-full transition-all duration-300"
              style={{
                boxShadow: isActive ? `0 0 25px ${day.colors[0]}` : 'none',
                color: isActive ? day.colors[0] : 'rgba(255,255,255,0.7)'
              }}
            >
              <Icon size={18} className="md:w-5 md:h-5" />
            </motion.div>

            {/* Tooltip */}
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap glass-card px-3 py-1.5 rounded-lg pointer-events-none">
              {day.displayDate}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default NavigationDock;
