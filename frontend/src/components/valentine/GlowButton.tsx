import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface GlowButtonProps {
  onClick: () => void;
  gradient: string;
  glowColor: string;
  children?: ReactNode;
}

const GlowButton = ({ onClick, gradient, glowColor, children }: GlowButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative group w-full md:w-auto"
    >


      {/* Pulsating Glow (Minimized) */}
      <motion.div
        className="absolute -inset-1 rounded-xl md:rounded-2xl opacity-40 blur-md pointer-events-none"
        style={{ background: gradient }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Button body */}
      <div 
        className="relative px-8 py-4 md:px-12 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl text-primary-foreground flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden"
        style={{ 
          background: gradient,
          boxShadow: `0 4px 15px -3px ${glowColor}`
        }}
      >
        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }}
        />

        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />

        <span className="relative z-10">{children || 'Open Gift'}</span>
        <Heart className="relative z-10 fill-current animate-heartbeat" size={20} />
      </div>
    </motion.button>
  );
};

export default GlowButton;
