import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

import {
  WEEK_DATA,
  CONFIG,
  isFuture,
  getInitialDayIndex,
} from "@/lib/valentineData";
import LiquidEther from "@/components/valentine/LiquidEther";
import FlipCard from "@/components/valentine/FlipCard";
import NavigationDock from "@/components/valentine/NavigationDock";
import IntroOverlay from "@/components/valentine/IntroOverlay";
import TransitionModal from "@/components/valentine/TransitionModal";
import AudioControls from "@/components/valentine/AudioControls";


const Index = () => {
  // Main game logic
  const [started, setStarted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [partnerName, setPartnerName] = useState(CONFIG.partnerName);
  const audioRef = useRef<HTMLAudioElement>(null);
  const seenPopups = useRef(new Set<number>());

  const lockedIndices = useMemo(() => {
    return WEEK_DATA.map((day, index) =>
      isFuture(day.dateObj) ? index : -1
    ).filter((i) => i !== -1);
  }, []);

  // Extract name from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameFromUrl = params.get("name");
    if (nameFromUrl) {
      setPartnerName(nameFromUrl);
    }
  }, []);

  // Set initial day on mount
  useEffect(() => {
    setDayIndex(getInitialDayIndex());
  }, []); // Run only once

  // Reset gift state when day changes
  // 1. Handle Day Change (Reset gift, Load new audio)
  useEffect(() => {
    setShowGift(false);
    if (audioRef.current && started) {
      // Only set src and play if the game has started
      audioRef.current.src = WEEK_DATA[dayIndex].audio;
      if (!isMuted) {
        audioRef.current
          .play()
          .catch((error) => console.log("Audio play failed:", error));
      }
    }
  }, [dayIndex, started]);

  // 2. Handle Play/Pause Toggle (Mute/Unmute/Start)
  useEffect(() => {
    if (audioRef.current && started) {
      if (isMuted) {
        audioRef.current.pause(); // Or just let it play if volume is 0, but pause is better
      } else {
        audioRef.current
          .play()
          .catch((error) => console.log("Audio play failed:", error));
      }
    }
  }, [isMuted, started]);



  const currentDay = WEEK_DATA[dayIndex];

  // Handle page transition (immediate)
  const handlePageChange = (newIndex: number) => {
    setDayIndex(newIndex);
  };

  // 3. Automated Popups for ALL days (1.5s delay)
  useEffect(() => {
    if (started) {
      const idx = dayIndex;

      // Ensure popup runs only ONCE per day index per session
      if (seenPopups.current.has(idx)) return;

      let message = "";

      // Define messages for each day
      if (idx === 0) message = "Kaisa Hai?😁"; // Rose
      else if (idx === 1) message = "Yeh wala?😉"; // Propose
      else if (idx === 2) message = "😓"; // Chocolate
      else if (idx === 4) message = "Enjoy Full Song 🎶"; // Promise
      else if (idx === 7) message = "Last only for you!!🤍"; // Valentine

      // If we have a message, schedule the popup
      if (message) {
        // Mark as seen immediately so it doesn't try again if effect re-runs quickly
        seenPopups.current.add(idx);

        const timer = setTimeout(() => {
          setTransitionMessage(message);
          setShowTransition(true);

          // Hide popup automatically after 3 seconds
          setTimeout(() => {
            setShowTransition(false);
          }, 3000);
        }, 1500); // 1.5s delay after load

        return () => clearTimeout(timer);
      }
    }
  }, [dayIndex, started]);

  // Handle confetti and flip on BUTTON CLICK only
  const handleOpenGift = () => {
    // Immediate flip and confetti (de-linked from popup)
    triggerConfetti();
    setShowGift(true);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: currentDay.colors,
        shapes: ["circle"],
        scalar: 1.2,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: currentDay.colors,
        shapes: ["circle"],
        scalar: 1.2,
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
      shapes: ["circle", "square"],
      scalar: 1.5,
    });
  };

  const handleStart = () => {
    setStarted(true);
    // Unmute on start
    setIsMuted(false);
    
    // Explicitly set the initial source and play when starting
    if (audioRef.current) {
      audioRef.current.src = currentDay.audio;
      audioRef.current.load(); // Ensure loading starts
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Hidden audio element */}
      <audio ref={audioRef} loop crossOrigin="anonymous" preload="none" />

      {/* Dynamic fluid background */}
      {/* Aurora background */}
      {/* Liquid Ether Background */}
      <div className="fixed inset-0 z-0">
        <LiquidEther
          colors={currentDay.colors}
          mouseForce={20}
          cursorSize={100}
          isViscous
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.5}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
      </div>

      {/* Intro overlay */}
      <AnimatePresence>
        {!started && (
          <IntroOverlay onStart={handleStart} partnerName={partnerName} />
        )}
        {showTransition && <TransitionModal message={transitionMessage} />}
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
                For {partnerName}
              </span>
            </motion.div>

            {/* Audio controls */}
            <AudioControls
              isMuted={isMuted}
              onToggle={() => setIsMuted(!isMuted)}
            />
          </motion.div>

          {/* Day indicator - Moved to relative positioning to prevent overlap */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 md:mb-8 z-20"
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
            partnerName={partnerName}
          />
          
        </div>
      )}

      {/* Navigation dock */}
      {started && (
        <NavigationDock
          currentIndex={dayIndex}
          setIndex={handlePageChange}
          lockedIndices={lockedIndices}
        />
      )}
    </div>
  );
};

export default Index;
