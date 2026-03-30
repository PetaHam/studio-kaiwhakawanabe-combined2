'use client';

import React from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function ManaBackground() {
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  if (!profile?.manaBackgroundEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-[0.06] dark:opacity-[0.04] flex items-center justify-center bg-transparent">
      <div className="w-[400vmax] h-[400vmax] animate-swirl flex-shrink-0 flex items-center justify-center origin-center">
        <svg
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-primary"
        >
          <defs>
            <symbol id="pitau" viewBox="0 0 100 100">
               <path 
                d="M50 50 C50 15, 95 15, 95 50 C95 75, 75 95, 50 95 C25 95, 5 75, 5 50 C5 25, 25 5, 50 5 C70 5, 85 20, 85 40 C85 55, 75 65, 60 65 C45 65, 35 55, 35 40 C35 30, 45 20, 55 20" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </symbol>
            
            <pattern id="kowhaiwhai-grid" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
              <use href="#pitau" x="50" y="50" width="100" height="100" opacity="0.5" />
              <use href="#pitau" x="250" y="250" width="100" height="100" opacity="0.3" transform="rotate(180 300 300)" />
            </pattern>

            <radialGradient id="central-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            
            <mask id="mana-mask">
              <rect width="1000" height="1000" fill="url(#central-fade)" />
            </mask>
          </defs>
          
          <rect 
            width="1000" 
            height="1000" 
            fill="url(#kowhaiwhai-grid)" 
            mask="url(#mana-mask)"
          />
        </svg>
      </div>
    </div>
  );
}