'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { HourlyForecast } from "../types/weather";

const CHIBA_LATITUDE = 35.6073;
const CHIBA_LONGITUDE = 140.1063;
const OPEN_METEO_PARAMS = new URLSearchParams({
  latitude: String(CHIBA_LATITUDE),
  longitude: String(CHIBA_LONGITUDE),
  hourly: 'temperature_2m,precipitation_probability,weathercode',
  timezone: 'Asia/Tokyo',
  forecast_days: '3',
});
const OPEN_METEO_API_BASE_URL = `https://api.open-meteo.com/v1/forecast?${OPEN_METEO_PARAMS.toString()}`;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
  };
};

function toHourlyForecasts(data: OpenMeteoResponse): HourlyForecast[] {
  return data.hourly.time.map((time, index) => ({
    time,
    temperature: data.hourly.temperature_2m[index],
    precipitationProbability: data.hourly.precipitation_probability[index],
    weatherCode: data.hourly.weathercode[index],
  }));
}

type HourlyWeatherContextType = {
  hourlyForecast: HourlyForecast[] | null;
  loading: boolean;
  error: string | null;
};

const HourlyWeatherContext = createContext<HourlyWeatherContextType | undefined>(undefined);

export function HourlyWeatherProvider({ children }: { children: ReactNode }) {
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHourlyWeather = async () => {
    try {
      // loading の初期値は true。再取得時に true へ戻さないことで、
      // 5分ごとの更新中も前回のデータを表示し続けられる
      const response = await fetch(OPEN_METEO_API_BASE_URL);
      if (!response.ok) {
        throw new Error('時間帯別の天気情報の取得に失敗しました');
      }
      const data: OpenMeteoResponse = await response.json();
      setHourlyForecast(toHourlyForecasts(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setStateはすべてawait後に実行される非同期関数で、マウント時fetch+定期更新の標準パターン
    fetchHourlyWeather();
    const interval = setInterval(fetchHourlyWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <HourlyWeatherContext.Provider value={{ hourlyForecast, loading, error }}>
      {children}
    </HourlyWeatherContext.Provider>
  );
}

export function useHourlyWeather() {
  const context = useContext(HourlyWeatherContext);
  if (context === undefined) {
    throw new Error('useHourlyWeather must be used within a HourlyWeatherProvider');
  }
  return context;
}
