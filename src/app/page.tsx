import { Clock } from "../_components/Clock";
import { Weather } from "../_components/Weather";
import { TimeProvider } from "../_contexts/TimeContext";
import { WeatherProvider } from "../_contexts/WeatherContext";

export default function Home() {
  return (
    <TimeProvider>
      <WeatherProvider>
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
            <Clock />
            <Weather />
          </main>
        </div>
      </WeatherProvider>
    </TimeProvider>
  );
}
