'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { calculateClothingScore, getClothingDescription } from "../_utils/clothingScore";
import { WeatherData, ClothingIndex, Forecast } from "../types/weather";

const CHIBA_CITY_ID = 120010;
const WEATHER_API_BASE_URL = `https://weather.tsukumijima.net/api/forecast/city/${CHIBA_CITY_ID}`;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

type TodayTemperatureCache = {
  date: string;
  max: string | null;
  min: string | null;
};

// 当日の最高/最低気温は、観測済みの時刻を過ぎるとAPIがnullを返すようになる
// (最高気温は昼過ぎ、最低気温は未明を過ぎると発生しやすい)。
// 一度取得できた値を日付単位でキャッシュし、以降nullが返ってきても
// 表示され続けるようにする。日付が変わったらキャッシュも入れ替える。
function fillTodayTemperature(
  forecast: Forecast,
  cache: TodayTemperatureCache | null
): { forecast: Forecast; cache: TodayTemperatureCache } {
  const isSameDay = cache?.date === forecast.date;
  const observedMax = forecast.temperature.max?.celsius ?? null;
  const observedMin = forecast.temperature.min?.celsius ?? null;
  const max = observedMax ?? (isSameDay ? cache.max : null);
  const min = observedMin ?? (isSameDay ? cache.min : null);

  return {
    forecast: {
      ...forecast,
      temperature: {
        max: max !== null ? { celsius: max } : undefined,
        min: min !== null ? { celsius: min } : undefined,
      },
    },
    cache: { date: forecast.date, max, min },
  };
}

type WeatherContextType = {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  clothingIndex: ClothingIndex | null;
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clothingIndex, setClothingIndex] = useState<ClothingIndex | null>(null);
  const todayTempCacheRef = useRef<TodayTemperatureCache | null>(null);

  const fetchWeather = async () => {
    try {
      // loading の初期値は true。再取得時に true へ戻さないことで、
      // 5分ごとの更新中も前回のデータを表示し続けられる
      const response = await fetch(WEATHER_API_BASE_URL);
      if (!response.ok) {
        throw new Error('天気情報の取得に失敗しました');
      }
      const data: WeatherData = await response.json();

      if (data.forecasts[0]) {
        const filled = fillTodayTemperature(data.forecasts[0], todayTempCacheRef.current);
        data.forecasts[0] = filled.forecast;
        todayTempCacheRef.current = filled.cache;
      }

      setWeather(data);

      if (data.forecasts[0]) {
        const score = calculateClothingScore(data.forecasts[0]);
        setClothingIndex(getClothingDescription(score));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setStateはすべてawait後に実行される非同期関数で、マウント時fetch+定期更新の標準パターン
    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <WeatherContext.Provider value={{ weather, loading, error, clothingIndex }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
} 
