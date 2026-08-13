'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import DayJs from "../_libs/dayjsJa";
import type { Dayjs } from "dayjs";

type TimeContextType = {
  time: Dayjs;
};

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  // SSR 時と hydration 時で時刻テキストがズレると hydration エラーになるため、
  // マウント後に初めて時刻を確定して描画を開始する
  const [time, setTime] = useState<Dayjs | null>(null);

  useEffect(() => {
    setTime(DayJs());
    const timer = setInterval(() => {
      setTime(DayJs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (time === null) {
    return null;
  }

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
