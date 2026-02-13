import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";

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
import HeartStarField from "@/components/valentine/HeartStarField";
import { useDebounce } from "@/hooks/useDebounce";


const Index = () => {
  // Main game logic
  const [started, setStarted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [partnerName, setPartnerName] = useState(CONFIG.partnerName);
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  
  // Easter Egg State
  const SECRET_SONG_URL = "/music/Sitaare.mp3";
  const [tapCount, setTapCount] = useState(0);
  const [easterEggUnlocked, setEasterEggUnlocked] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounce audio switching to prevent thrashing during rapid navigation
  const debouncedDayIndex = useDebounce(dayIndex, 500); // 500ms delay

  // Reset gift state when day changes
  useEffect(() => {
    setShowGift(false);
  }, [dayIndex]);

  // Handle Audio Logic (Debounced)
  useEffect(() => {
    if (audioRef.current) {
      // If Easter egg is unlocked, DO NOT change the song when switching days
      if (easterEggUnlocked) {
        if (!audioRef.current.src.includes("Sitaare.mp3")) {
           // If for some reason it's not the secret song, set it (fallback)
           audioRef.current.src = SECRET_SONG_URL;
           audioRef.current.play().catch((e) => console.log("Secret song play failed:", e));
        }
      } else {
        // Normal behavior: Set day's audio based on DEBOUNCED index
        // This prevents loading all songs while swiping quickly
        if (dayIndex >= 0 && WEEK_DATA[debouncedDayIndex]) {
            const targetAudio = WEEK_DATA[debouncedDayIndex].audio;
            
            // Only set src if it's different
            if (!audioRef.current.src.includes(targetAudio)) {
                audioRef.current.src = targetAudio;
                audioRef.current.load();
                
                if (started && !isMuted) {
                    audioRef.current.play().catch((e) => console.log("Audio play failed:", e));
                }
            }
        }
      }
    }
  }, [debouncedDayIndex, started, isMuted, easterEggUnlocked]);

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
    });
  };

  // Easter Egg Logic - Moved to top


  // Preload Audio Assets (ONCE on mount)
  useEffect(() => {
    // Preload Secret Song
    const secretAudio = new Audio(SECRET_SONG_URL);
    secretAudio.preload = "auto";
    // We don't force load() here to strictly save data, relying on preload="auto" usually works,
    // but explicit load() ensures it starts fetching.
    // However, only do this ONCE.
    
    // Optional: Preload the FIRST day's song immediately
    const firstDayAudio = new Audio(WEEK_DATA[0].audio);
    firstDayAudio.preload = "auto";
  }, []);

  const handleEasterEggTap = () => {
    // If already unlocked, just show love message without changing song/resetting
    if (easterEggUnlocked) {
      toast.success("I Love You! 💖", {
        description: "You found the secret song! 🎶",
        duration: 3000,
      });
      return;
    }

    // Clear existing timeout to allow rapid tapping
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setTapCount(prev => {
      const newCount = prev + 1;
      
      if (newCount < 5) {
        toast("No!! 🤫", {
          description: "Keep tapping...",
          duration: 1000,
        });
      } else if (newCount === 5) {
        setEasterEggUnlocked(true); // Unlock permanently
        toast.success("I Love You! 💖", {
          description: "You found the secret song! 🎶",
          duration: 3000,
        });
        
        // Trigger song change
        if (audioRef.current) {
          audioRef.current.src = SECRET_SONG_URL;
          audioRef.current.play().catch(e => console.log("Secret song play failed:", e));
        }
        
        return 5; // Keep at 5 or reset, doesn't matter as unlocked check handles it
      }
      
      // Reset count if no tap for 1 second
      clickTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 1000);

      return newCount;
    });
  };

  const handleWrongTap = () => {
    toast("Not this!! 😅", {
      description: "Try tapping somewhere else...",
      duration: 1000,
    });
  };

  const handleHeartbeatTrigger = () => {
    setShowHeartbeat(true);
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
      <audio ref={audioRef} loop crossOrigin="anonymous" preload="auto" />

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
              onClick={handleEasterEggTap}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-white/10 cursor-pointer select-none active:bg-white/10 transition-colors"
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
            className="relative mb-6 md:mb-8 z-20 cursor-pointer active:scale-95 transition-transform"
            onClick={handleWrongTap}
          >
            <div
              className="text-xs md:text-sm font-medium tracking-[0.3em] uppercase cursor-pointer select-none"
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
            onWrongTap={handleWrongTap}
            onIconTap={dayIndex === 7 ? handleHeartbeatTrigger : handleWrongTap}
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

      {/* Heartbeat Overlay */}
      <AnimatePresence>
        {showHeartbeat && (
            <HeartStarField onClose={() => setShowHeartbeat(false)} partnerName={partnerName} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
