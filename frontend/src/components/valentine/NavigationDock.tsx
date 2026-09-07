import { WEEK_DATA } from '@/lib/valentineData';
import { toast } from 'sonner';
import Dock from './Dock';
import { Lock } from 'lucide-react';

interface NavigationDockProps {
  currentIndex: number;
  setIndex: (index: number) => void;
  lockedIndices: number[];
  hidden?: boolean;
}

const NavigationDock = ({ currentIndex, setIndex, lockedIndices, hidden = false }: NavigationDockProps) => {
  if (hidden) return null;
  const dockItems = WEEK_DATA.map((day, idx) => {
    const isLocked = lockedIndices.includes(idx);
    const Icon = isLocked ? Lock : day.icon;

    return {
      icon: <Icon size={20} className="text-current" />,
      label: day.displayDate,
      onClick: () => {
        if (isLocked) {
          toast.error(`Patience, my love! 🔒`, {
            description: `${day.name} unlocks on ${day.displayDate}`,
            duration: 2000,
          });
          return;
        }
        setIndex(idx);
      },
      isActive: idx === currentIndex,
      isLocked: isLocked,
      activeColor: day.colors[0]
    };
  });

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="mx-auto w-fit max-w-full overflow-x-auto no-scrollbar pointer-events-auto pb-safe">
        <Dock 
          items={dockItems} 
          panelHeight={68}
          baseItemSize={45}
          magnification={70}
        />
      </div>
    </div>
  );
};

export default NavigationDock;
