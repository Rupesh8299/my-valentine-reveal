import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MessageScrollerProps = {
  text: string;
  id: string;
};

const MessageScroller = ({ text, id }: MessageScrollerProps) => {
  return (
    <div className="relative overflow-hidden h-6 flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute whitespace-nowrap text-sm font-medium text-white text-center"
        >
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MessageScroller;
