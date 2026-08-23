'use client';

import { Dayjs } from "dayjs";
import { useHourlyWeather } from "../_contexts/HourlyWeatherContext";
import { groupHourlyForecastByDay } from "../_utils/hourlyForecastGrouping";
import { getWeatherIconKindFromCode, getWeatherLabelFromCode } from "../_utils/weatherCode";
import { WeatherIcon } from "./WeatherIcon";
import { TemperatureGraph } from "./TemperatureGraph";
import type { HourlyForecast } from "../types/weather";

type WeatherDetailProps = {
  dates: Dayjs[];
};

const DAY_LABELS = ['今日', '明日', '明後日'];

type DayHourlyTableProps = {
  date: Dayjs;
  dayLabel: string;
  slots: HourlyForecast[];
  isToday: boolean;
};

function formatHour(time: string): string {
  return String(Number(time.slice(11, 13)));
}

const DayHourlyTable = ({ date, dayLabel, slots, isToday }: DayHourlyTableProps) => (
  <div
    className={`panel flex min-h-0 flex-col gap-[0.5vh] p-[1.2vh] ${isToday ? 'panel-accent' : ''}`}
    style={{ flex: isToday ? 1.5 : 1 }}
  >
    <div className="flex shrink-0 items-center gap-[1vh]">
      <span
        className={`fs-2xs rounded-full px-[1.2vh] py-[0.2vh] font-bold ${
          isToday ? 'bg-accent text-on-accent' : 'bg-soft text-ink-soft'
        }`}
      >
        {dayLabel}
      </span>
      <span className="fs-xs font-bold text-ink">
        {date.format('M/D')}({date.format('ddd')})
      </span>
    </div>

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <span key={slot.time} className="fs-2xs flex-1 text-center text-ink-faint">
            {formatHour(slot.time)}
          </span>
        ))}
      </div>
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <div key={slot.time} className="flex-1">
            <div className="relative mx-auto h-[calc(3vh*var(--scale,1))] w-[calc(3vh*var(--scale,1))]">
              <WeatherIcon
                kind={getWeatherIconKindFromCode(slot.weatherCode)}
                label={getWeatherLabelFromCode(slot.weatherCode)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <TemperatureGraph temperatures={slots.map((slot) => slot.temperature)} />
      </div>
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <span key={slot.time} className="fs-2xs flex-1 text-center font-bold text-cold">
            {Math.round(slot.precipitationProbability)}%
          </span>
        ))}
      </div>
    </div>
  </div>
);

export function WeatherDetail({ dates }: WeatherDetailProps) {
  const { hourlyForecast, loading, error } = useHourlyWeather();

  // 定期再取得中は前回のデータを表示し続ける(スピナーやエラーで画面をチラつかせない)
  if (!hourlyForecast) {
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

  const dailySlots = groupHourlyForecastByDay(hourlyForecast, dates);

  return (
    <div className="flex h-full min-h-0 flex-col gap-[1.5vh]">
      {dailySlots.map((slots, index) => (
        <DayHourlyTable
          key={dates[index].format('YYYY-MM-DD')}
          date={dates[index]}
          dayLabel={DAY_LABELS[index]}
          slots={slots}
          isToday={index === 0}
        />
      ))}
    </div>
  );
}
