
import React from 'react';
import FloatingNav from './components/navigation/FloatingNav';

export default function Layout({ children }) {
  return (
    <div className="relative min-h-screen">
      <FloatingNav />
      {children}
    </div>
  );
}
