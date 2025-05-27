'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type DisplayMode = 'clock' | 'garbage' | 'weather' | 'default';

type DisplayModeContextType = {
  mode: DisplayMode;
  toggleMode: () => void;
};

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(undefined);

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>('default');

  const toggleMode = () => {
    const modes: DisplayMode[] = ['default', 'clock', 'garbage', 'weather'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
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
