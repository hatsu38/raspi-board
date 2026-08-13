'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export const DISPLAY_MODES = ['default', 'clock', 'garbage', 'weather'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

type DisplayModeContextType = {
  mode: DisplayMode;
  toggleMode: () => void;
};

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined);

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>('default');

  const toggleMode = () => {
    const currentIndex = DISPLAY_MODES.indexOf(mode);
    const nextIndex = (currentIndex + 1) % DISPLAY_MODES.length;
    setMode(DISPLAY_MODES[nextIndex]);
  };

  return (
    <DisplayModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode() {
  const context = useContext(DisplayModeContext);
  if (context === undefined) {
    throw new Error('useDisplayMode must be used within a DisplayModeProvider');
  }
  return context;
}
