'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ScheduleEvent } from '../types/schedule';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

type ScheduleContextType = {
  events: ScheduleEvent[] | null;
  loading: boolean;
  error: string | null;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      // loading の初期値は true。再取得時に true へ戻さないことで、
      // 5分ごとの更新中も前回のデータを表示し続けられる(WeatherContextと同じ方針)
      const response = await fetch('/api/timetree');
      if (!response.ok) {
        throw new Error('予定の取得に失敗しました');
      }
      const data: { events: ScheduleEvent[] } = await response.json();
      setEvents(data.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setStateはすべてawait後に実行される非同期関数で、マウント時fetch+定期更新の標準パターン
    fetchSchedule();
    const interval = setInterval(fetchSchedule, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScheduleContext.Provider value={{ events, loading, error }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
