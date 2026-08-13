'use client';

import { useWeather } from "../_contexts/WeatherContext";
import Image from "next/image";
import { Dayjs } from "dayjs";
import type { Forecast } from "../types/weather";
import { getGarbageTypes } from "./Garbage";
import { WeatherIcon } from "./WeatherIcon";

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
  celsius?: string | null;
  className: string;
};

const Temperature = ({ label, celsius, className }: TemperatureProps) => (
  <div className="flex flex-col items-center">
    <span className="fs-xs font-medium text-ink-soft">{label}</span>
    <span className={`fs-xl font-bold leading-tight ${celsius ? className : 'text-ink-faint'}`}>
      {celsius ?? '--'}
      {/* ° と C を並べると丸ゴシックでは字間が開いて見えるため合成済みの1文字を使う */}
      <span className="fs-sm font-bold">℃</span>
    </span>
  </div>
);

/*
 * 降水確率は数字だけだと遠目で読み取れないため、バーの高さでも同じ値を示す。
 * 傘が必要かどうかを一瞬で判断できるようにするのが目的。
 */
const RainChance = ({ label, value }: { label: string; value: string }) => {
  const chance = parseInt(value);
  const isUnknown = Number.isNaN(chance);

  return (
    <div className="flex flex-col items-center gap-[0.3vh]">
      <span className="fs-2xs text-ink-faint">{label}</span>
      {/* 短いバーが角丸に埋もれないよう、半径は控えめにしている */}
      <div className="flex h-[calc(4.5vh*var(--scale,1))] w-[65%] items-end overflow-hidden rounded-[0.6vh] bg-bar-track">
        {!isUnknown && (
          <i className="w-full rounded-[0.6vh] bg-cold" style={{ height: `${chance}%` }} />
        )}
      </div>
      <span className={`fs-sm font-bold ${isUnknown ? 'text-ink-faint' : 'text-ink'}`}>
        {isUnknown ? '--' : `${chance}%`}
      </span>
    </div>
  );
};

const WeatherCard = ({ forecast, date, dayLabel, isToday }: WeatherCardProps) => {
  const garbageTypes = getGarbageTypes(date);

  return (
    <div
      className={`panel flex min-h-0 flex-col items-center justify-between p-[2vh] ${
        isToday ? 'panel-accent' : ''
      }`}
    >
      {/* 日付ヘッダー */}
      <div className="flex items-center gap-[1.2vh]">
        <span
          className={`fs-xs rounded-full px-[1.4vh] py-[0.3vh] font-bold ${
            isToday ? 'bg-accent text-on-accent' : 'bg-soft text-ink-soft'
          }`}
        >
          {dayLabel}
        </span>
        <span className="fs-sm font-bold text-ink">
          {date.format('M/D')}({date.format('ddd')})
        </span>
      </div>

      {/* その日のゴミ出し */}
      <div className="flex flex-wrap items-center justify-center gap-[1vh]">
        {garbageTypes.length > 0 ? (
          garbageTypes.map((type) => (
            <div
              key={type.name}
              className="flex items-center gap-[0.8vh] rounded-full bg-leaf-soft px-[1.5vh] py-[0.5vh]"
            >
              <div className="relative h-[calc(2.8vh*var(--scale,1))] w-[calc(2.8vh*var(--scale,1))]">
                <Image
                  src={type.image}
                  alt={type.name}
                  fill
                  className="illustration object-contain"
                />
              </div>
              <span className="fs-xs font-bold text-leaf-ink">{type.name}</span>
            </div>
          ))
        ) : (
          <span className="fs-xs py-[0.5vh] text-ink-faint">ゴミ出しなし</span>
        )}
      </div>

      {/* 天気アイコンと天気 */}
      <div className="flex flex-col items-center gap-[0.5vh]">
        <div className="relative h-[calc(8.5vh*var(--scale,1))] w-[calc(8.5vh*var(--scale,1))]">
          <WeatherIcon telop={forecast.telop} fallbackUrl={forecast.image?.url} />
        </div>
        <h3 className="fs-lg font-bold text-ink">{forecast.telop}</h3>
      </div>

      {/* 最高・最低気温 */}
      <div className="flex items-center gap-[4vh]">
        <Temperature label="最高" celsius={forecast.temperature.max?.celsius} className="text-hot" />
        <div className="h-[calc(5vh*var(--scale,1))] w-px bg-line" />
        <Temperature label="最低" celsius={forecast.temperature.min?.celsius} className="text-cold" />
      </div>

      {/* 降水確率 */}
      <div className="w-full">
        <div className="grid grid-cols-4 rounded-[1.2vh] bg-soft py-[1vh]">
          {RAIN_SLOTS.map((slot) => (
            <RainChance
              key={slot.key}
              label={slot.label}
              value={forecast.chanceOfRain[slot.key]}
            />
          ))}
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
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-accent"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="fs-md text-hot">{error}</p>
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
