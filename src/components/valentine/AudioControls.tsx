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
      className="group flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2.5 rounded-full glass-card border border-white/10 hover:bg-white/10 transition-all active:scale-95"
    >
      <motion.div
        animate={{ rotate: isMuted ? 0 : [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </motion.div>
      
      <span className="text-xs font-semibold uppercase tracking-widest hidden sm:block">
        {isMuted ? 'Muted' : 'Playing'}
      </span>
      
      {!isMuted && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-green-400"
        />
      )}
    </motion.button>
  );
};

export default AudioControls;
