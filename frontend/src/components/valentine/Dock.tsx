import { MotionValue, useMotionValue, useSpring, useTransform, motion, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DockProps {
  items: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    isLocked?: boolean;
    activeColor?: string;
  }[];
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  distance?: number;
  className?: string;
}

const Dock = ({
  items,
  panelHeight = 68,
  baseItemSize = 50,
  magnification = 70,
  distance = 140,
  className,
}: DockProps) => {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  return (
    <motion.div
      onMouseMove={(e) => {
        mouseX.set(e.pageX);
        isHovered.set(1);
      }}
      onMouseLeave={() => {
        mouseX.set(Infinity);
        isHovered.set(0);
      }}
      onTouchMove={(e) => {
        // Handle touch interaction similarly to mouse
        const touch = e.touches[0];
        if (touch) {
          mouseX.set(touch.pageX);
          isHovered.set(1);
        }
      }}
      onTouchEnd={() => {
        mouseX.set(Infinity);
        isHovered.set(0);
      }}
      className={cn(
        "mx-auto flex w-fit gap-4 items-center rounded-2xl bg-gray-50/10 border border-white/10 px-4 py-3",
        className
      )}
      style={{
        height: panelHeight,
      }}
    >
      {items.map((item, index) => (
        <DockItem
          key={index}
          mouseX={mouseX}
          baseItemSize={baseItemSize}
          magnification={magnification}
          distance={distance}
          item={item}
        />
      ))}
    </motion.div>
  );
};

interface DockItemProps {
  mouseX: MotionValue<number>;
  baseItemSize: number;
  magnification: number;
  distance: number;
  item: DockProps['items'][0];
}

const DockItem = ({ mouseX, baseItemSize, magnification, distance, item }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const distanceCalc = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distanceCalc, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 180, // Increased stiffness for snappier return
    damping: 10,    // Reduced damping for less drag
  });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      className="aspect-square flex items-center justify-center rounded-full" 
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isHovered && !item.isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: -baseItemSize - 16, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="absolute left-1/2 w-fit whitespace-nowrap rounded-md border border-white/20 bg-black/80 px-2 py-0.5 text-xs text-white z-50 pointer-events-none"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={item.onClick}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full shadow-md transition-all duration-300",
          item.isActive 
            ? "bg-white/90 text-primary box-shadow-[0_0_25px_var(--active-color)]" 
            : "bg-white/10 hover:bg-white/20 text-white/70",
          item.isLocked && "cursor-not-allowed opacity-40 grayscale"
        )}
        style={{
          boxShadow: item.isActive ? `0 0 20px ${item.activeColor || 'white'}` : 'none',
          color: item.isActive ? (item.activeColor || 'black') : undefined
        }}
      >
        {item.icon}
      </motion.button>
      

    </motion.div>
  );
};

export default Dock;
