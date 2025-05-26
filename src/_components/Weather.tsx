'use client';

import { useWeather } from "../_contexts/WeatherContext";
import Image from "next/image";

export function Weather() {
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
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
      {clothingIndex && (
        <div className="mb-8 text-center">
          <h3 className="text-xl font-semibold mb-3">今日の服装指数</h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-32 h-32">
              <Image
                src={clothingIndex.image}
                alt={clothingIndex.description}
                fill
                className="rounded-lg object-contain"
              />
            </div>
            <p className="text-gray-300 text-lg">{clothingIndex.description}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-6">
        {weather.forecasts.slice(0, 3).map((forecast, index) => (
          <div 
            key={forecast.date} 
            className={`flex flex-col items-center ${
              index === 0 
                ? 'bg-white/20 rounded-lg p-5 shadow-lg transform scale-105' 
                : 'p-4'
            }`}
          >
            <p className={`text-sm text-gray-500 mb-3 ${
              index === 0 ? 'font-bold' : ''
            }`}>
              {index === 0 ? '今日' : index === 1 ? '明日' : '明後日'}
            </p>
            {forecast.image && (
              <div className={`relative mb-3 ${
                index === 0 ? 'w-24 h-24' : 'w-20 h-20'
              }`}>
                <Image
                  src={forecast.image.url}
                  alt={forecast.telop}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <h3 className={`font-semibold mb-2 ${
              index === 0 ? 'text-xl' : 'text-lg'
            }`}>{forecast.telop}</h3>
            <div className={`font-bold mb-3 ${
              index === 0 ? 'text-2xl' : 'text-xl'
            }`}>
              <p className="mb-1">
                <span className="text-red-500">最高</span>
                {forecast.temperature.max?.celsius || '--'}°C
              </p>
              <p>
                <span className="text-blue-500">最低</span>
                {forecast.temperature.min?.celsius || '--'}°C
              </p>
            </div>
            <div className="text-sm space-y-1">
              {Object.entries(forecast.chanceOfRain)
                .filter(([, value]) => value !== '--%')
                .map(([time, value]) => (
                  <p key={time} className="text-gray-400">
                    {time.replace('T', '').replace('_', '-')}: {value}
                  </p>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

