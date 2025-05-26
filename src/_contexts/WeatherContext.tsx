'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTime } from "./TimeContext";

type WeatherData = {
  publicTime: string;
  publicTimeFormatted: string;
  publishingOffice: string;
  title: string;
  link: string;
  description: {
    publicTime: string;
    publicTimeFormatted: string;
    headlineText: string;
    bodyText: string;
    text: string;
  };
  forecasts: Array<{
    date: string;
    dateLabel: string;
    telop: string;
    detail: {
      weather: string;
      wind: string;
      wave: string;
    };
    temperature: {
      min: {
        celsius: string | null;
        fahrenheit: string | null;
      };
      max: {
        celsius: string | null;
        fahrenheit: string | null;
      };
    };
    chanceOfRain: {
      T00_06: string;
      T06_12: string;
      T12_18: string;
      T18_24: string;
    };
    image: {
      title: string;
      url: string;
      width: number;
      height: number;
    };
  }>;
  location: {
    area: string;
    prefecture: string;
    district: string;
    city: string;
  };
  copyright: {
    title: string;
    link: string;
    image: {
      title: string;
      link: string;
      url: string;
      width: number;
      height: number;
    };
    provider: Array<{
      link: string;
      name: string;
      note: string;
    }>;
  };
};

type WeatherContextType = {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

const CHIBA_CITY_ID = 120010;
const WEATHER_API_BASE_URL = `https://weather.tsukumijima.net/api/forecast/city/${CHIBA_CITY_ID}`;

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { time } = useTime();

  const API_PARAMS = {
    coordinates: "35.613500964458,140.11271521767",
    appid: process.env.OPEN_WEATHER_API_KEY || "",
    units: "metric",
    setDate: time.format("YYYY-MM-DD"),
    lang: "ja",
    output: "json",
  }

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const query_params = new URLSearchParams(API_PARAMS); 
        const response = await fetch(`${WEATHER_API_BASE_URL}?${query_params}`);
        if (!response.ok) {
          throw new Error('天気情報の取得に失敗しました');
        }
        const data: WeatherData = await response.json();
        setWeather(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    // 5分ごとに天気情報を更新
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <WeatherContext.Provider value={{ weather, loading, error }}>
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
