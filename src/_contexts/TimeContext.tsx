'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import DayJs from "../_libs/dayjsJa";
import type { Dayjs } from "dayjs";

type TimeContextType = {
  time: Dayjs;
};

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [time, setTime] = useState(DayJs());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(DayJs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <TimeContext.Provider value={{ time }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useTime() {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
} 
