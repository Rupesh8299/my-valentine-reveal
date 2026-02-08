import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface TransitionModalProps {
  message: string;
}

const TransitionModal = ({ message }: TransitionModalProps) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-4 z-[100] pointer-events-none">
      <div className="relative">
        {/* Floating hearts effect */}
        <FloatingHearts />
        
        {/* Helper message bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="relative"
        >
          <div className="bg-black border border-white/20 px-6 py-4 rounded-2xl rounded-bl-sm shadow-2xl">
            <p className="text-lg md:text-xl font-bold text-white whitespace-nowrap drop-shadow-md">
              {message}
            </p>
          </div>
          
          {/* Triangle pointer (left-aligned) */}
          <div className="absolute -bottom-2 left-0 w-4 h-4 bg-black border-l border-b border-white/20 transform rotate-45" />
        </motion.div>
      </div>
    </div>
  );
};

const FloatingHearts = () => {
  const [hearts, setHearts] = useState<{ id: number; x: number; color: string }[]>([]);

  useEffect(() => {
    // Spawn hearts periodically
    const interval = setInterval(() => {
      const newHeart = {
        id: Date.now(),
        x: Math.random() * 60 - 30, // Random X offset
        color: ['#ef4444', '#ec4899', '#f472b6', '#fb7185'][Math.floor(Math.random() * 4)]
      };
      
      setHearts(prev => [...prev.slice(-15), newHeart]);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-full left-0 w-20 h-60 pointer-events-none overflow-visible">
      {hearts.map(heart => (
        <motion.div
          key={heart.id}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 1, 0],
            y: -200,
            x: heart.x,
            scale: [0.5, 1.2, 0.8]
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute bottom-0 left-8"
        >
          <Heart 
            fill={heart.color} 
            color={heart.color} 
            size={24} 
            className="filter drop-shadow-lg"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default TransitionModal;
