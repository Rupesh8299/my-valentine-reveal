import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import { DayData } from "@/lib/valentineData";
import GlowButton from "./GlowButton";
import SpotlightCard from "./SpotlightCard";
import MessageInput from "./MessageInput";
import GradientText from "./GradientText";


interface FlipCardProps {
  day: DayData;
  isFlipped: boolean;
  onFlip: () => void;
  onReset: () => void;
  partnerName: string;
  onWrongTap?: () => void;
  onIconTap?: () => void;
}

const FlipCard = ({
  day,
  isFlipped,
  onFlip,
  onReset,
  partnerName,
  onWrongTap,
  onIconTap,
}: FlipCardProps) => {
  const Icon = day.icon;

  return (
    <div className="w-full max-w-xl h-[65vh] min-h-[450px] max-h-[650px] perspective-1000">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.8,
          type: "spring",
          stiffness: 50,
          damping: 15,
        }}
        className="w-full h-full relative preserve-3d"
        style={{ willChange: "transform" }}
      >
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 backface-hidden">
          <SpotlightCard className="w-full h-full glass-card-strong rounded-3xl md:rounded-4xl p-6 md:p-10 flex flex-col items-center justify-center gap-6 md:gap-8 text-center relative" spotlightColor="rgba(255, 255, 255, 0.2)">
            {/* Background gradient accent */}
            <div
              className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
              style={{ backgroundColor: day.colors[1] }}
            />
            <div
              className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-700"
              style={{ backgroundColor: day.colors[0] }}
            />

            {/* Date badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={onWrongTap}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border border-white/10 text-xs md:text-sm font-medium tracking-wider uppercase cursor-pointer active:scale-95 transition-transform select-none"
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: day.colors[0] }}
              />
              <span className="text-foreground/80">{day.displayDate}</span>
            </motion.div>

            {/* Icon and title */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="relative"
              >
                {/* Glow behind icon */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-50"
                  style={{ background: day.gradient }}
                />
                <div
                  className="relative w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-2xl cursor-pointer active:scale-95 transition-transform"
                  style={{ background: day.gradient }}
                  onClick={onIconTap || onWrongTap}
                >
                  <Icon className="w-10 h-10 md:w-14 md:h-14 text-white drop-shadow-lg" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative cursor-pointer select-none active:scale-95 transition-transform"
                onClick={onWrongTap}
              >
                <GradientText
                  colors={day.colors}
                  animationSpeed={6}
                  showBorder={false}
                  className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight"
                >
                  {day.name}
                </GradientText>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm md:text-base text-muted-foreground font-light cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={onWrongTap}
              >
                Click Here
              </motion.p>
            </div>

            {/* Open button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full md:w-auto"
            >
              <GlowButton
                onClick={onFlip}
                gradient={day.gradient}
                glowColor={day.colors[0]}
              >
                Babe!!
              </GlowButton>
            </motion.div>
          </SpotlightCard>
        </div>

        {/* BACK OF CARD */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="w-full h-full glass-card-strong rounded-3xl md:rounded-4xl p-6 md:p-10 flex flex-col items-center justify-between text-center relative overflow-y-auto custom-scrollbar">
            {/* Background radial gradient */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${day.colors[0]}40, transparent 70%)`,
              }}
            />



            {/* Reset button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="absolute top-4 right-4 p-2.5 rounded-full glass-card border border-white/10 hover:bg-white/10 transition-colors z-20"
            >
              <RefreshCcw size={18} className="text-foreground/60" />
            </button>

            {/* Large emoji gift */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="flex-1 flex items-center justify-center relative"
            >
              <img
                src={day.illustration}
                alt=""
                aria-hidden="true"
                className="h-28 w-28 md:h-40 md:w-40 drop-shadow-2xl animate-float"
              />
            </motion.div>

            {/* Message Input for specific days */}
            {['promise', 'kiss', 'valentine'].includes(day.id) && (
              <div className="w-full px-2 z-30 mb-2">
                <MessageInput 
                  dayName={day.name} 
                  partnerName={partnerName}
                  placeholder={
                    day.id === 'promise' ? "Promise me !!" :
                    day.id === 'kiss' ? "Where's my Kiss Babe !!" :
                    day.id === 'valentine' ? "Say i'll Listen..." :
                    `Write a message for ${day.name}...`
                  }
                />
              </div>
            )}

            {/* Quote section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative z-10 w-full px-2 cursor-pointer select-none active:scale-95 transition-transform"
              onClick={onWrongTap}
            >
              <span className="block text-4xl md:text-5xl text-foreground/15 font-serif leading-none mb-2">
                "
              </span>
              <p className="text-lg md:text-xl font-medium italic text-foreground/90 font-romantic leading-relaxed line-clamp-3">
                {day.message}
              </p>
              <span className="block text-4xl md:text-5xl text-foreground/15 font-serif leading-none mt-2 text-right">
                "
              </span>
            </motion.div>

            {/* Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 md:mt-6"
            >
              <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                With all my Love
              </p>
              <p
                key={day.id} // Force re-render when day changes to fix gradient text issue
                className="font-romantic text-2xl md:text-3xl font-bold"
                style={{
                  background: day.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text", // Standard property
                  color: "transparent", // Fallback
                }}
              >
                For {partnerName}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FlipCard;
