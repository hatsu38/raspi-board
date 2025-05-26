'use client';

import { useWeather } from "../_contexts/WeatherContext";
import Image from "next/image";
import { Dayjs } from "dayjs";
import type { Forecast } from "../types/weather";
import { getGarbageTypes } from "./Garbage";

type WeatherProps = {
  dates: Dayjs[];
};

type WeatherCardProps = {
  forecast: Forecast;
  date: Dayjs;
  isToday: boolean;
};

const WeatherCard = ({ forecast, date, isToday }: WeatherCardProps) => {
  const garbageTypes = getGarbageTypes(date);

  return (
    <div 
      className={`flex flex-col items-center ${
        isToday 
          ? 'bg-white/10 rounded-lg p-2 sm:p-3 shadow-lg transform scale-105' 
          : 'p-2'
      }`}
    >
      <p className={`text-xs text-gray-500 mb-2 ${isToday ? 'font-bold' : ''}`}>
        {date.format('MM/DD')}({date.format('ddd')})
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-2">
        {garbageTypes.length > 0 ? (
          garbageTypes.map((type) => (
            <div 
              key={type.name} 
              className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-white/30 transition-colors"
            >
              <div className="relative w-5 h-5 sm:w-6 sm:h-6">
                <Image
                  src={type.image}
                  alt={type.name}
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-medium text-gray-200 leading-tight">
                  {type.name}
                </span>
                <span className="text-[8px] sm:text-[10px] text-gray-400 leading-tight">
                  {type.days.join('・')}曜日
                  {type.weekNumber && `（第${type.weekNumber.join('・')}週）`}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1.5">
            <span className="text-[10px] sm:text-xs text-gray-400">ゴミ出しなし</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        {forecast.image && (
          <div className={`relative ${isToday ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-12 h-12 sm:w-14 sm:h-14'}`}>
            <Image
              src={forecast.image.url}
              alt={forecast.telop}
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>
      <h3 className={`font-semibold mb-1 ${isToday ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
        {forecast.telop}
      </h3>
      <div className={`font-bold mb-2 ${isToday ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
        <p className="mb-0.5">
          <span className="text-red-500">最高</span>
          {forecast.temperature.max?.celsius || '--'}°C
        </p>
        <p>
          <span className="text-blue-500">最低</span>
          {forecast.temperature.min?.celsius || '--'}°C
        </p>
      </div>
      <div className="text-[10px] sm:text-xs space-y-0.5">
        {Object.entries(forecast.chanceOfRain)
          .filter(([, value]) => value !== '--%')
          .map(([time, value]) => (
            <p key={time} className="text-gray-400">
              {time.replace('T', '').replace('_', '-')}: {value as string}
            </p>
          ))}
      </div>
    </div>
  );
};

export function Weather({ dates }: WeatherProps) {
  const { weather, loading, error } = useWeather();

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {weather.forecasts.slice(0, 3).map((forecast, index) => (
          <WeatherCard
            key={forecast.date}
            forecast={forecast}
            date={dates[index]}
            isToday={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

