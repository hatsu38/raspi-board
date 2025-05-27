'use client';

import { Dayjs } from "dayjs";
import { Weather } from "./Weather";
import { Clock } from "./Clock";
import { Garbage } from "./Garbage";
import { useWeather } from "../_contexts/WeatherContext";
import Image from "next/image";
type DashboardProps = {
  dates: Dayjs[];
};

export function Dashboard({ dates }: DashboardProps) {
  const { clothingIndex } = useWeather();

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 flex items-center justify-center">
          <Clock />
        </div>
        {clothingIndex && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-white">今日の服装指数</h3>
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-20 sm:w-30 sm:h-30 rounded-lg">
                  <Image
                    src={clothingIndex.image}
                    alt={clothingIndex.description}
                    className="object-contain rounded-lg"
                    fill
                  />
                </div>
                <p className="text-white text-md">{clothingIndex.description}</p>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
          <Garbage date={dates[0]} />
        </div>
      </div>
      <Weather dates={dates} />
    </div>
  );
} 
