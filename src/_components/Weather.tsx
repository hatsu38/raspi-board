'use client';

import { useWeather } from "../_contexts/WeatherContext";
import Image from "next/image";
import { Dayjs } from "dayjs";
import { getGarbageTypes } from "./Garbage";

type WeatherProps = {
  dates: Dayjs[];
};

export function Weather({ dates }: WeatherProps) {
  const { weather, loading, error, clothingIndex } = useWeather();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        {error}
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 shadow-lg">
      {clothingIndex && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold mb-2">今日の服装指数</h3>
          <div className="flex flex-col items-center space-y-2">
            <div className="relative w-24 h-24">
              <Image
                src={clothingIndex.image}
                alt={clothingIndex.description}
                fill
                className="rounded-lg object-contain"
              />
            </div>
            <p className="text-gray-300 text-sm">{clothingIndex.description}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {weather.forecasts.slice(0, 3).map((forecast, index) => {
          const garbageTypes = getGarbageTypes(dates[index]);
          return (
            <div 
              key={forecast.date} 
              className={`flex flex-col items-center ${
                index === 0 
                  ? 'bg-white/20 rounded-lg p-3 shadow-lg transform scale-105' 
                  : 'p-2'
              }`}
            >
              <p className={`text-xs text-gray-500 mb-2 ${
                index === 0 ? 'font-bold' : ''
              }`}>
                {dates[index].format('MM/DD')}({dates[index].format('ddd')})
              </p>
              {garbageTypes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {garbageTypes.map((type) => (
                      <div key={type.name} className="flex items-center gap-1">
                        <div className="relative w-8 h-8">
                          <Image
                            src={type.image}
                            alt={type.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full text-gray-300">
                          {type.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              <div className="flex items-center gap-2 mb-2">
                {forecast.image && (
                  <div className={`relative ${
                    index === 0 ? 'w-16 h-16' : 'w-14 h-14'
                  }`}>
                    <Image
                      src={forecast.image.url}
                      alt={forecast.telop}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              <h3 className={`font-semibold mb-1 ${
                index === 0 ? 'text-lg' : 'text-base'
              }`}>{forecast.telop}</h3>
              <div className={`font-bold mb-2 ${
                index === 0 ? 'text-xl' : 'text-lg'
              }`}>
                <p className="mb-0.5">
                  <span className="text-red-500">最高</span>
                  {forecast.temperature.max?.celsius || '--'}°C
                </p>
                <p>
                  <span className="text-blue-500">最低</span>
                  {forecast.temperature.min?.celsius || '--'}°C
                </p>
              </div>
              <div className="text-xs space-y-0.5">
                {Object.entries(forecast.chanceOfRain)
                  .filter(([, value]) => value !== '--%')
                  .map(([time, value]) => (
                    <p key={time} className="text-gray-400">
                      {time.replace('T', '').replace('_', '-')}: {value}
                    </p>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

