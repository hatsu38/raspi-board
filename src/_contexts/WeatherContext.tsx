'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { calculateClothingScore, getClothingDescription } from "../_utils/clothingScore";
import { WeatherData, ClothingIndex } from "../types/weather";

const CHIBA_CITY_ID = 120010;
const WEATHER_API_BASE_URL = `https://weather.tsukumijima.net/api/forecast/city/${CHIBA_CITY_ID}`;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

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

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const response = await fetch(WEATHER_API_BASE_URL);
      if (!response.ok) {
        throw new Error('天気情報の取得に失敗しました');
      }
      const data: WeatherData = await response.json();
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
