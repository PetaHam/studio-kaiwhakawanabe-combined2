'use client';

import React, { useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

/**
 * AmbientGlow provides a persistent visual "vibe" across the entire app.
 * It manages the dark/light mode class on the document root and provides subtle decorative glows.
 */
export function AmbientGlow() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  const isDarkMode = profile?.themePreference === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-3] overflow-hidden bg-background">
      {/* Background Tint - Subtle color wash */}
      <div 
        className="absolute inset-0 opacity-[0.03] transition-all duration-1000 bg-primary" 
      />
      
      {/* Top-Down Ambient Color Flush */}
      <div 
        className="absolute top-0 left-0 right-0 h-[400px] opacity-[0.05] transition-all duration-1000" 
        style={{ background: `linear-gradient(to bottom, hsl(var(--primary)), transparent)` }} 
      />

      {/* Soft Bottom Bloom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[200px] opacity-[0.04] transition-all duration-1000" 
        style={{ background: `linear-gradient(to top, hsl(var(--primary)), transparent)` }} 
      />
      
      {/* Very faint texture */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
    </div>
  );
}