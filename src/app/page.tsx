'use client';

import { TimeProvider } from "../_contexts/TimeContext";
import { WeatherProvider } from "../_contexts/WeatherContext";
import { useTime } from "../_contexts/TimeContext";
import { useMemo } from "react";
import { Dashboard } from "../_components/Dashboard"

function MainContent() {
  const { time } = useTime();
  
  const dates = useMemo(() => {
    return [0, 1, 2].map(days => time.add(days, 'day'));
  }, [time]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-2 py-4 sm:px-4 lg:px-6">
        <main className="flex flex-col items-center gap-4 max-w-4xl mx-auto">
          <Dashboard dates={dates} />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <TimeProvider>
      <WeatherProvider>
        <MainContent />
      </WeatherProvider>
    </TimeProvider>
  );
}
