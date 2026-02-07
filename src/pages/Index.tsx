import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';

import { WEEK_DATA, CONFIG, isFuture, getInitialDayIndex } from '@/lib/valentineData';
import FluidBackground from '@/components/valentine/FluidBackground';
import FlipCard from '@/components/valentine/FlipCard';
import NavigationDock from '@/components/valentine/NavigationDock';
import IntroOverlay from '@/components/valentine/IntroOverlay';
import AudioControls from '@/components/valentine/AudioControls';

const Index = () => {
  const [started, setStarted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const lockedIndices = useMemo(() => {
    return WEEK_DATA.map((day, index) => isFuture(day.dateObj) ? index : -1).filter(i => i !== -1);
  }, []);

  // Set initial day on mount
  useEffect(() => {
    setDayIndex(getInitialDayIndex());
  }, []);

  // Reset gift state when day changes
  useEffect(() => {
    setShowGift(false);
  }, [dayIndex]);

  const currentDay = WEEK_DATA[dayIndex];

  // Handle confetti on gift open
  const handleOpenGift = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: currentDay.colors,
        shapes: ['circle'],
        scalar: 1.2
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: currentDay.colors,
        shapes: ['circle'],
        scalar: 1.2
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
    
    // Burst at center
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: currentDay.colors,
      shapes: ['circle', 'square'],
      scalar: 1.5
    });

    setShowGift(true);
  };

  const handleStart = () => {
    setStarted(true);
    // Unmute on start
    setIsMuted(false);
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Hidden audio element */}
      <audio ref={audioRef} loop crossOrigin="anonymous" />
      
      {/* Dynamic fluid background */}
      <FluidBackground colors={currentDay.colors} />
      
      {/* Intro overlay */}
      <AnimatePresence>
        {!started && <IntroOverlay onStart={handleStart} />}
      </AnimatePresence>

      {/* Main content */}
      {started && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 pb-24 md:pb-32">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-30"
          >
            {/* Partner name badge */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-white/10"
            >
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentDay.colors[0] }}
              />
              <span className="text-xs md:text-sm font-medium text-foreground/80">
                For {CONFIG.partnerName}
              </span>
            </motion.div>

            {/* Audio controls */}
            <AudioControls isMuted={isMuted} onToggle={() => setIsMuted(!isMuted)} />
          </motion.div>

          {/* Day indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2"
          >
            <div 
              className="text-xs md:text-sm font-medium tracking-[0.3em] uppercase"
              style={{ color: currentDay.colors[0] }}
            >
              Day {dayIndex + 1} of 8
            </div>
          </motion.div>

          {/* 3D Flip Card */}
          <FlipCard 
            day={currentDay}
            isFlipped={showGift}
            onFlip={handleOpenGift}
            onReset={() => setShowGift(false)}
          />
        </div>
      )}

      {/* Navigation dock */}
      {started && (
        <NavigationDock 
          currentIndex={dayIndex} 
          setIndex={setDayIndex}
          lockedIndices={lockedIndices}
        />
      )}
    </div>
  );
};

export default Index;
