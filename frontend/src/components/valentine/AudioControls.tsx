import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioControlsProps {
  isMuted: boolean;
  onToggle: () => void;
}

const AudioControls = ({ isMuted, onToggle }: AudioControlsProps) => {
  return (
    <motion.button 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      onClick={onToggle}
      aria-label={isMuted ? "Unmute music" : "Mute music"}
      className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all hover:bg-white/[0.14] active:scale-95"
    >
      <motion.div
        animate={{ rotate: isMuted ? 0 : [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </motion.div>
      
      {!isMuted && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-300"
        />
      )}
    </motion.button>
  );
};

export default AudioControls;
