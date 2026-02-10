import { motion } from "framer-motion";
import { Heart, Play } from "lucide-react";

interface IntroOverlayProps {
  onStart: () => void;
  partnerName: string;
}

const IntroOverlay = ({ onStart, partnerName }: IntroOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-4"
    >
      {/* Animated background hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              y: "100vh",
              x: `${Math.random() * 100}vw`,
              opacity: 0,
              scale: 0.5 + Math.random() * 0.5,
            }}
            animate={{
              y: "-20vh",
              opacity: [0, 0.3, 0],
              rotate: [-15, 15, -15],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
            className="absolute text-primary/30"
            style={{ willChange: "transform, opacity" }}
          >
            <Heart className="w-6 h-6 md:w-8 md:h-8 fill-current" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-center space-y-6 md:space-y-8 relative z-10"
      >
        {/* Animated heart icon */}
        <motion.div
          className="flex justify-center mb-6"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-50 bg-primary rounded-full scale-150" />
            <Heart className="relative w-16 h-16 md:w-20 md:h-20 text-primary fill-primary/30" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="space-y-3">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #ec4899 0%, #ef4444 50%, #f97316 100%)",
              }}
            >
              Valentine's Week
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground font-light"
          >
            A special journey for{" "}
            <span className="font-medium text-foreground">{partnerName}</span>
          </motion.p>
        </div>

        {/* Start button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 rounded-2xl font-bold text-lg md:text-xl transition-all duration-300 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #ec4899 0%, #ef4444 50%, #f97316 100%)",
          }}
        >
          {/* Button glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20" />

          {/* Animated ring */}
          <div className="absolute -inset-1 rounded-2xl border-2 border-primary/50 animate-pulse opacity-50" />

          <Play size={22} className="fill-white relative z-10" />
          <span className="text-white relative z-10">Begin Your Journey</span>
        </motion.button>

        {/* Decorative text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-muted-foreground/60 font-romantic text-xl"
        >
          Feb 7 - Feb 14, 2026
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default IntroOverlay;
