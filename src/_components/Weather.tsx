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
  dayLabel: string;
  isToday: boolean;
};

const DAY_LABELS = ['今日', '明日', '明後日'];

const RAIN_SLOTS = [
  { key: 'T00_06', label: '0-6' },
  { key: 'T06_12', label: '6-12' },
  { key: 'T12_18', label: '12-18' },
  { key: 'T18_24', label: '18-24' },
] as const;

type TemperatureProps = {
  label: string;
  celsius?: string;
  className: string;
};

const Temperature = ({ label, celsius, className }: TemperatureProps) => (
  <div className="flex flex-col items-center">
    <span className="fs-xs text-white/50">{label}</span>
    <span className={`fs-xl font-bold leading-tight ${celsius ? className : 'text-white/30'}`}>
      {celsius ?? '--'}
      <span className="fs-sm font-semibold">°C</span>
    </span>
  </div>
);

const WeatherCard = ({ forecast, date, dayLabel, isToday }: WeatherCardProps) => {
  const garbageTypes = getGarbageTypes(date);

  return (
    <div
      className={`flex min-h-0 flex-col items-center justify-between rounded-[2vh] p-[2vh] ${
        isToday
          ? 'bg-white/10 ring-1 ring-sky-400/40'
          : 'bg-white/[0.04] border border-white/8'
      }`}
    >
      {/* 日付ヘッダー */}
      <div className="flex items-center gap-[1.2vh]">
        <span
          className={`fs-xs rounded-full px-[1.4vh] py-[0.3vh] font-semibold ${
            isToday ? 'bg-sky-400/20 text-sky-300' : 'bg-white/10 text-white/60'
          }`}
        >
          {dayLabel}
        </span>
        <span className="fs-sm font-semibold text-white/80">
          {date.format('M/D')}({date.format('ddd')})
        </span>
      </div>

      {/* その日のゴミ出し */}
      <div className="flex flex-wrap items-center justify-center gap-[1vh]">
        {garbageTypes.length > 0 ? (
          garbageTypes.map((type) => (
            <div
              key={type.name}
              className="flex items-center gap-[0.8vh] rounded-full bg-amber-400/15 px-[1.5vh] py-[0.5vh]"
            >
              <div className="relative h-[calc(2.8vh*var(--scale,1))] w-[calc(2.8vh*var(--scale,1))]">
                <Image
                  src={type.image}
                  alt={type.name}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="fs-xs font-medium text-amber-200">{type.name}</span>
            </div>
          ))
        ) : (
          <span className="fs-xs py-[0.5vh] text-white/35">ゴミ出しなし</span>
        )}
      </div>

      {/* 天気アイコンと天気 */}
      <div className="flex flex-col items-center gap-[0.5vh]">
        {forecast.image && (
          <div className="relative h-[calc(8vh*var(--scale,1))] w-[calc(11vh*var(--scale,1))]">
            <Image
              src={forecast.image.url}
              alt={forecast.telop}
              fill
              className="object-contain"
            />
          </div>
        )}
        <h3 className="fs-lg font-semibold text-white">{forecast.telop}</h3>
      </div>

      {/* 最高・最低気温 */}
      <div className="flex items-center gap-[4vh]">
        <Temperature label="最高" celsius={forecast.temperature.max?.celsius} className="text-rose-300" />
        <div className="h-[calc(5vh*var(--scale,1))] w-px bg-white/10" />
        <Temperature label="最低" celsius={forecast.temperature.min?.celsius} className="text-sky-300" />
      </div>

      {/* 降水確率 */}
      <div className="w-full">
        <div className="grid grid-cols-4 rounded-[1.2vh] bg-black/25 py-[1vh]">
          {RAIN_SLOTS.map((slot) => {
            const chance = parseInt(forecast.chanceOfRain[slot.key]);
            const isRainy = !Number.isNaN(chance) && chance >= 50;
            return (
              <div key={slot.key} className="flex flex-col items-center gap-[0.2vh]">
                <span className="fs-2xs text-white/40">{slot.label}</span>
                <span
                  className={`fs-sm font-semibold ${
                    Number.isNaN(chance)
                      ? 'text-white/25'
                      : isRainy
                        ? 'text-sky-300'
                        : 'text-white/80'
                  }`}
                >
                  {Number.isNaN(chance) ? '--' : `${chance}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function Weather({ dates }: WeatherProps) {
  const { weather, loading, error } = useWeather();

  // 定期再取得中は前回のデータを表示し続ける(スピナーやエラーで画面をチラつかせない)
  if (!weather) {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-white/60"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="fs-md text-rose-300">{error}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-[2.5vh]">
      {weather.forecasts.slice(0, 3).map((forecast, index) => (
        <WeatherCard
          key={forecast.date}
          forecast={forecast}
          date={dates[index]}
          dayLabel={DAY_LABELS[index]}
          isToday={index === 0}
        />
      ))}
    </div>
  );
}
