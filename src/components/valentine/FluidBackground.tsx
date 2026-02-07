import { useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';

interface FluidBackgroundProps {
  colors: [string, string, string];
}

const FluidBackground = ({ colors }: FluidBackgroundProps) => {
  const mouseX = useSpring(0, { stiffness: 30, damping: 25 });
  const mouseY = useSpring(0, { stiffness: 30, damping: 25 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const targetX = (e.clientX / window.innerWidth - 0.5) * 100;
      const targetY = (e.clientY / window.innerHeight - 0.5) * 100;
      mouseX.set(targetX);
      mouseY.set(targetY);
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Base gradient */}
      <div 
        className="absolute inset-0 opacity-40 transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${colors[0]}20 0%, transparent 70%)`
        }}
      />

      {/* Animated blobs layer */}
      <div className="absolute inset-0 opacity-50 mix-blend-screen">
        {/* Primary blob */}
        <motion.div
          animate={{
            x: [0, 80, -40, 60, 0],
            y: [0, -60, 40, -30, 0],
            scale: [1, 1.3, 0.9, 1.2, 1],
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1]
          }}
          style={{ 
            x: mouseX,
            y: mouseY,
            backgroundColor: colors[0],
            filter: 'blur(100px)'
          }}
          className="absolute -top-20 -left-20 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full opacity-60 animate-blob"
        />

        {/* Secondary blob */}
        <motion.div
          animate={{
            x: [0, -60, 80, -40, 0],
            y: [0, 70, -50, 60, 0],
            scale: [1.2, 0.8, 1.4, 0.9, 1.2],
          }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1]
          }}
          style={{ 
            backgroundColor: colors[1],
            filter: 'blur(120px)'
          }}
          className="absolute -bottom-40 -right-20 w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full opacity-50 animate-blob-delayed"
        />

        {/* Tertiary blob */}
        <motion.div
          animate={{
            x: [0, 50, -30, 40, 0],
            y: [0, -40, 60, -50, 0],
            scale: [0.9, 1.2, 0.8, 1.1, 0.9],
          }}
          transition={{ 
            duration: 35, 
            repeat: Infinity, 
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1]
          }}
          style={{ 
            backgroundColor: colors[2],
            filter: 'blur(80px)'
          }}
          className="absolute top-1/3 left-1/4 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full opacity-40 animate-blob-slow"
        />

        {/* Center accent blob */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          style={{ 
            backgroundColor: colors[0],
            filter: 'blur(60px)'
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] rounded-full"
        />
      </div>

      {/* Frosted glass overlay */}
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[100px]" />

      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 100%)',
          opacity: 0.4
        }}
      />
    </div>
  );
};

export default FluidBackground;
