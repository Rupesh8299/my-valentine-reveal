import { lazy, Suspense, useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import * as tus from "tus-js-client";
import {
  WEEK_DATA,
  CONFIG,
  isFuture,
  getInitialDayIndex,
} from "@/lib/valentineData";
import FlipCard from "@/components/valentine/FlipCard";
import NavigationDock from "@/components/valentine/NavigationDock";
import IntroOverlay from "@/components/valentine/IntroOverlay";
import TransitionModal from "@/components/valentine/TransitionModal";
import AudioControls from "@/components/valentine/AudioControls";
import HeartStarField from "@/components/valentine/HeartStarField";
import { useDebounce } from "@/hooks/useDebounce";
import { assetUrl, dayMusicUrl } from "@/lib/api";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import RealtimeChat, { RealtimeMessage } from "@/components/valentine/RealtimeChat";

const LiquidEther = lazy(() => import("@/components/valentine/LiquidEther"));

type IndexProps = {
  ownerSpaceId?: string;
  ownerName?: string;
  partnerNameOverride?: string;
  connectionPartnerName?: string;
};

const Index = ({ ownerSpaceId, ownerName, partnerNameOverride, connectionPartnerName }: IndexProps) => {
  const location = useLocation();
  const routeState = location.state as { partnerName?: string; connectionPartnerName?: string; inviteToken?: string; spaceId?: string } | null;
  const isOwnerPage = Boolean(ownerSpaceId);
  // Main game logic
  const [started, setStarted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [dynamicAudio, setDynamicAudio] = useState<string | null>(null);
  const [dynamicAudioResolved, setDynamicAudioResolved] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [partnerName, setPartnerName] = useState(partnerNameOverride || CONFIG.partnerName);
  const [showHeartbeat, setShowHeartbeat] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatMessages, setChatMessages] = useState<RealtimeMessage[]>([]);
  const chatStorageKey = `valentine-chat-${ownerSpaceId || routeState?.spaceId || routeState?.inviteToken || "home"}`;
  const pendingStorageKey = `${chatStorageKey}-pending`;
  const storageWarningShown = useRef(false);
  const createMessageId = () =>
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const saveChat = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      const messages = Array.isArray(value) ? value : [];
      const reduced = messages
        .slice(-100)
        .map((message) => {
          if (!message || typeof message !== "object") return message;
          const copy = { ...(message as Record<string, unknown>) };
          delete copy.media;
          return copy;
        });
      try {
        localStorage.setItem(key, JSON.stringify(reduced));
      } catch {
        if (!storageWarningShown.current) {
          storageWarningShown.current = true;
          toast.error("This device is low on chat storage. Your full conversation remains available to connected devices.");
        }
      }
    }
  };
  const [remoteGestures, setRemoteGestures] = useState<{ id: string; x: number; y: number }[]>([]);
  const [remotePointer, setRemotePointer] = useState<{ x: number; y: number } | null>(null);
  const lastPointerSentAt = useRef(0);
  const livePartnerName = isOwnerPage
    ? (connectionPartnerName || partnerName)
    : (connectionPartnerName || routeState?.connectionPartnerName || "Sender");
  const realtimeToken = isOwnerPage ? undefined : routeState?.inviteToken;
  const { status: connectionStatus, peerConnected, sendData } = useRealtimeConnection(
    realtimeToken,
    (data) => {
      if (!data || typeof data !== "object") return;
      if (
        (data as { type?: string }).type === "chat-history"
        || (data as { type?: string }).type === "chat-history-sync"
      ) {
        const history = (data as { messages?: Array<RealtimeMessage & { senderRole?: string }> }).messages || [];
        setChatMessages((current) => {
          const merged = [...current];
          history.forEach((message) => {
            if (!message.id || merged.some((item) => item.id === message.id)) return;
            merged.push({
              ...message,
              sender: message.senderRole === (isOwnerPage ? "owner" : "lover") ? "me" : "them",
            });
          });
          const next = merged.slice(-200);
          saveChat(chatStorageKey, next);
          return next;
        });
        return;
      }
      if ((data as { type?: string }).type === "liquid-pointer") {
        const pointer = data as { x?: number; y?: number };
        if (typeof pointer.x === "number" && typeof pointer.y === "number") {
          setRemotePointer({ x: pointer.x, y: pointer.y });
        }
        return;
      }
      if ((data as { type?: string }).type === "gesture") {
        const gesture = data as { x: number; y: number; id: string };
        setRemoteGestures((current) => [...current.slice(-5), gesture]);
        window.setTimeout(() => setRemoteGestures((current) => current.filter((item) => item.id !== gesture.id)), 1400);
        return;
      }
      if ((data as { type?: string }).type !== "chat") return;
      const incomingData = data as Omit<RealtimeMessage, "sender"> & { senderRole?: string };
      const incoming = { ...incomingData, sender: incomingData.senderRole === (isOwnerPage ? "owner" : "lover") ? "me" as const : "them" as const };
      setChatMessages((current) => {
        const next = [...current.filter((message) => message.id !== incoming.id), incoming];
        saveChat(chatStorageKey, next.slice(-200));
        return next;
      });
      if (!chatOpen) setUnreadMessages((count) => count + 1);
    },
    ownerSpaceId,
  );
  useEffect(() => {
    try {
      const legacyKey = routeState?.inviteToken ? `valentine-chat-${routeState.inviteToken}` : "";
      const savedValue = localStorage.getItem(chatStorageKey)
        || (legacyKey && legacyKey !== chatStorageKey ? localStorage.getItem(legacyKey) : null)
        || "[]";
      const saved = JSON.parse(savedValue) as RealtimeMessage[];
      if (Array.isArray(saved)) setChatMessages(saved.slice(-200));
    } catch {
      localStorage.removeItem(chatStorageKey);
    }
  }, [chatStorageKey]);
  useEffect(() => {
    if (!peerConnected) return;
    let pending: Omit<RealtimeMessage, "sender">[] = [];
    try {
      pending = JSON.parse(localStorage.getItem(pendingStorageKey) || "[]");
    } catch {
      localStorage.removeItem(pendingStorageKey);
    }
    const remaining = pending.filter((message) => !sendData(message));
    if (remaining.length) saveChat(pendingStorageKey, remaining);
    else localStorage.removeItem(pendingStorageKey);
  }, [pendingStorageKey, peerConnected, sendData]);
  useEffect(() => {
    if (!peerConnected || !chatMessages.length) return;
    const localRole = isOwnerPage ? "owner" : "lover";
    sendData({
      type: "chat-history-sync",
      messages: chatMessages.map(({ sender, ...message }) => ({
        ...message,
        senderRole: sender === "me" ? localRole : localRole === "owner" ? "lover" : "owner",
      })),
    });
  }, [chatMessages, isOwnerPage, peerConnected, sendData]);
  const queueChatMessage = (message: Omit<RealtimeMessage, "sender">) => {
    const localMessage: RealtimeMessage = { ...message, sender: "me" };
    setChatMessages((current) => {
      const next = [...current.filter((item) => item.id !== message.id), localMessage].slice(-200);
      saveChat(chatStorageKey, next);
      return next;
    });
    if (!sendData(message)) {
      const pending = JSON.parse(localStorage.getItem(pendingStorageKey) || "[]") as Omit<RealtimeMessage, "sender">[];
      saveChat(pendingStorageKey, [...pending.filter((item) => item.id !== message.id), message].slice(-100));
    }
    return true;
  };
  const queueMedia = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Media must be 50 MB or smaller.");
      return false;
    }
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind) {
      toast.error("Only images and videos can be shared.");
      return false;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Storage is not configured.");
      return false;
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const bucketName = "chat-media";
    const messageId = createMessageId();
    
    // We send an optimistic message immediately with a temporary local URL
    // so the sender can see their video/image locally right away.
    const localUrl = URL.createObjectURL(file);
    queueChatMessage({ type: "chat", id: messageId, text: "Uploading...", sentAt: new Date().toISOString(), media: { kind, url: localUrl, name: file.name } });

    const toastId = toast.loading(`Uploading ${file.name}... (0%)`);

    return new Promise<boolean>((resolve) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucketName,
          objectName: fileName,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6 MB chunks
        onError: (error) => {
          toast.error(`Upload failed: ${error.message}`, { id: toastId });
          resolve(false);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
          toast.loading(`Uploading ${file.name}... (${percentage}%)`, { id: toastId });
        },
        onSuccess: () => {
          toast.success("Upload complete!", { id: toastId });
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
          
          // Re-send the actual message with the public URL to sync with everyone
          queueChatMessage({ type: "chat", id: messageId, text: "", sentAt: new Date().toISOString(), media: { kind, url: publicUrl, name: file.name } });
          resolve(true);
        }
      });
      upload.start();
    });
  };
  const sendGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!peerConnected) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [role='button']")) return;
    const now = performance.now();
    if (now - lastPointerSentAt.current < 32) return;
    lastPointerSentAt.current = now;
    sendData({
      type: "liquid-pointer",
      x: Math.round(((event.clientX / window.innerWidth) * 2 - 1) * 1000) / 1000,
      y: Math.round(-((event.clientY / window.innerHeight) * 2 - 1) * 1000) / 1000,
    });
    sendData({
      type: "gesture",
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      x: Math.round((event.clientX / window.innerWidth) * 100),
      y: Math.round((event.clientY / window.innerHeight) * 100),
    });
  };
  const isTouchDevice = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0),
    [],
  );
  
  // Easter Egg State
  const SECRET_SONG_URL = assetUrl("music", "Sitaare.mp3");
  const [tapCount, setTapCount] = useState(0);
  const [easterEggUnlocked, setEasterEggUnlocked] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const activeAudioSourceRef = useRef("");
  const seenPopups = useRef(new Set<number>());

  const lockedIndices = useMemo(() => {
    return WEEK_DATA.map((day, index) =>
      isFuture(day.dateObj) ? index : -1
    ).filter((i) => i !== -1);
  }, []);

  // Extract name from URL query parameters
  useEffect(() => {
    const configuredName = partnerNameOverride || (location.state as { partnerName?: string } | null)?.partnerName;
    if (configuredName) {
      setPartnerName(configuredName);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const nameFromUrl = params.get("name");
    if (nameFromUrl) {
      setPartnerName(nameFromUrl);
    }
  }, [location.state, partnerNameOverride]);

  // Set initial day on mount
  useEffect(() => {
    setDayIndex(getInitialDayIndex());
  }, []); // Run only once

  // Debounce audio switching to prevent thrashing during rapid navigation
  const debouncedDayIndex = useDebounce(dayIndex, 500); // 500ms delay

  useEffect(() => {
    const day = WEEK_DATA[debouncedDayIndex];
    const mode = import.meta.env.VITE_DYNAMIC_MUSIC_MODE === "preview" ? "preview" : "radio";
    let cancelled = false;
    setDynamicAudio(null);
    setDynamicAudioResolved(false);
    dayMusicUrl(day.id, mode)
      .then((url) => {
        if (!cancelled) {
          setDynamicAudio(url);
          setDynamicAudioResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicAudio(null);
          setDynamicAudioResolved(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedDayIndex]);

  // Reset gift state when day changes
  useEffect(() => {
    setShowGift(false);
  }, [dayIndex]);

  // Handle Audio Logic (Debounced)
  useEffect(() => {
    if (audioRef.current) {
      if (!dynamicAudioResolved) return;
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
            const targetAudio = dynamicAudio || WEEK_DATA[debouncedDayIndex].audio;
            
            // Track the exact logical source so a new day's dynamic track
            // always replaces the previous day's bundled fallback.
            if (activeAudioSourceRef.current !== targetAudio) {
                const wasPlaying = started && !isMuted;
                audioRef.current.pause();
                activeAudioSourceRef.current = targetAudio;
                audioRef.current.src = targetAudio;
                audioRef.current.load();
                
                if (wasPlaying) {
                    audioRef.current.play().catch((e) => console.log("Audio play failed:", e));
                }
            }
        }
      }
    }
  }, [debouncedDayIndex, dynamicAudio, dynamicAudioResolved, started, isMuted, easterEggUnlocked]);

  // 2. Handle Play/Pause Toggle (Mute/Unmute/Start)
  useEffect(() => {
    if (audioRef.current && started && audioRef.current.src) {
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
    if (audioRef.current && dynamicAudioResolved) {
      const targetAudio = dynamicAudio || currentDay.audio;
      activeAudioSourceRef.current = targetAudio;
      audioRef.current.src = targetAudio;
      audioRef.current.load();
      audioRef.current.play().catch((e) => console.log("Audio play failed:", e));
    }
  };

  return (
    <div onPointerDown={sendGesture} className="fixed inset-0 w-full h-[100dvh] overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      <AnimatePresence>
        {remoteGestures.map((gesture) => (
          <motion.div
            key={gesture.id}
            initial={{ opacity: 0, scale: 0.4, y: 8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.8], y: -42 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none fixed z-40 text-3xl text-rose-300 drop-shadow-[0_0_14px_rgba(244,114,182,0.8)]"
            style={{ left: `${gesture.x}%`, top: `${gesture.y}%` }}
            aria-hidden="true"
          >
            ♥
          </motion.div>
        ))}
      </AnimatePresence>
      {/* Hidden audio element */}
      <audio ref={audioRef} loop crossOrigin="anonymous" preload="auto" />

      <div className="fixed inset-0 z-0">
        <Suspense fallback={null}>
          <LiquidEther
            remotePointer={remotePointer}
            colors={currentDay.colors}
            mouseForce={isTouchDevice ? 14 : 20}
            cursorSize={isTouchDevice ? 80 : 100}
            isViscous={!isTouchDevice}
            viscous={isTouchDevice ? 18 : 30}
            iterationsViscous={isTouchDevice ? 0 : 32}
            iterationsPoisson={isTouchDevice ? 10 : 32}
            resolution={isTouchDevice ? 0.32 : 0.5}
            BFECC={!isTouchDevice}
            isBounce={false}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={isTouchDevice ? 1.7 : 2.5}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </Suspense>
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
        <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 pb-24 md:pb-32">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-0 z-[110] flex items-center gap-3 p-4 md:p-6"
          >
            {/* Partner name badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={handleEasterEggTap}
              whileTap={{ scale: 0.95 }}
              className="flex h-12 min-w-0 w-fit max-w-[45vw] items-center gap-2 rounded-full border border-white/10 px-4 py-2 glass-card cursor-pointer select-none whitespace-nowrap transition-colors active:bg-white/10"
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentDay.colors[0] }}
              />
              <span className="truncate text-xs font-medium text-foreground/80 md:text-sm">
                {isOwnerPage ? ownerName : `For ${partnerName}`}
              </span>
            </motion.div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
              {(routeState?.inviteToken || isOwnerPage) && (
                <RealtimeChat
                  connected={peerConnected}
                  partnerName={livePartnerName}
                  messages={chatMessages}
                  unread={unreadMessages}
                  open={chatOpen}
                  onOpen={() => {
                    setChatOpen((isOpen) => {
                      const nextOpen = !isOpen;
                      if (nextOpen) setUnreadMessages(0);
                      return nextOpen;
                    });
                  }}
                  onClose={() => setChatOpen(false)}
                  onPreviewChange={setMediaPreviewOpen}
                  onExpandedChange={setChatExpanded}
                  onSend={queueChatMessage}
                  onMedia={queueMedia}
                />
              )}
              <AudioControls
                isMuted={isMuted}
                onToggle={() => setIsMuted(!isMuted)}
              />
            </div>
          </motion.div>

          {/* Day label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-3 cursor-pointer select-none px-1 text-center active:scale-95"
            onClick={handleWrongTap}
          >
            <div
              className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.24em] md:text-sm md:tracking-[0.3em]"
              style={{ color: currentDay.colors[0] }}
            >
              Day {dayIndex + 1} of 8
            </div>
          </motion.div>

          {/* 3D Flip Card */}
          <div className="w-full max-w-xl translate-y-4 md:translate-y-6">
            <FlipCard
              day={currentDay}
              isFlipped={showGift}
              onFlip={handleOpenGift}
              onReset={() => {
                setShowGift(false);
              }}
              partnerName={partnerName}
              onWrongTap={handleWrongTap}
              onIconTap={dayIndex === 7 ? handleHeartbeatTrigger : handleWrongTap}
            />
          </div>
          
        </div>
      )}

      {/* Navigation dock */}
      {started && (
        <NavigationDock
          currentIndex={dayIndex}
          setIndex={handlePageChange}
          lockedIndices={lockedIndices}
          hidden={chatExpanded || mediaPreviewOpen}
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
