import { Clock } from "../_components/Clock";
import { Weather } from "../_components/Weather";
import { TimeProvider } from "../_contexts/TimeContext";
import { WeatherProvider } from "../_contexts/WeatherContext";

export default function Home() {
  return (
    <TimeProvider>
      <WeatherProvider>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <main className="flex flex-col items-center gap-8 max-w-4xl mx-auto">
              <div className="w-full max-w-md">
                <Clock />
              </div>
              <div className="w-full">
                <Weather />
              </div>
            </main>
          </div>
        </div>
      </WeatherProvider>
    </TimeProvider>
  );
}
