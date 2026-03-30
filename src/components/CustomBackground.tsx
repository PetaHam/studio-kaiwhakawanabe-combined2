
'use client';

import React from 'react';

/**
 * CustomBackground provides a clean, solid tactical base without the image pattern.
 * This ensures the HUD elements remain the primary focus of the judge's interface.
 */
export function CustomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden bg-white dark:bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/20 dark:from-slate-950/5 dark:via-transparent dark:to-slate-950/20" />
    </div>
  );
}
