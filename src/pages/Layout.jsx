
import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingNav from './components/navigation/FloatingNav';
import Footer from '@/components/navigation/Footer';
import CommandPalette from '@/components/system/CommandPalette';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a]">
      <a href="#main-content" className="sr-only sr-only-focusable">Skip to main content</a>
      <FloatingNav />
      <CommandPalette />
      <main id="main-content" className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
