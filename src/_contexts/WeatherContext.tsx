'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTime } from "./TimeContext";
import { calculateClothingScore } from "../_utils/clothingScore";
import { Forecast } from "../types/weather";

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
  forecasts: Forecast[];
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

type ClothingIndex = {
  index: number;
  description: string;
  image: string;
};

const getClothingDescription = (score: number): {
  text: string;
  image: string;
} => {
  if (score <= 10) return {
    text: 'ぶるぶる、何を着ても寒い！',
    image: '/clothes/10_ぶるぶる、何を着ても寒い！.png'
  };
  if (score <= 20) return {
    text: 'ダウンジャケットでしっかり防寒',
    image: '/clothes/20_ダウンジャケットでしっかり防寒.png'
  };
  if (score <= 30) return {
    text: 'コートを着ないと結構寒いなあ',
    image: '/clothes/30_コートを着ないと結構寒いなあ.png'
  };
  if (score <= 40) return {
    text: '裏地付トレンチコートがおすすめ',
    image: '/clothes/40_裏地付トレンチコートがおすすめ.png'
  };
  if (score <= 50) return {
    text: '薄手のジャケットを羽織ろう',
    image: '/clothes/50_薄手のジャケットを羽織ろう.png'
  };
  if (score <= 60) return {
    text: '長袖シャツ・カットソーで快適に',
    image: '/clothes/60_長袖シャツ・カットソーで快適に.png'
  };
  if (score <= 70) return {
    text: '半袖＋カーディガンで温度調節を',
    image: '/clothes/70_半袖＋カーディガンで温度調節を.png'
  };
  if (score <= 80) return {
    text: '半袖Tシャツ一枚で過ごせる暑さ',
    image: '/clothes/80_半袖Tシャツ一枚で過ごせる暑さ.png'
  };
  if (score <= 90) return {
    text: 'ノースリーブでもかなり暑い！',
    image: '/clothes/90_ノースリーブでもかなり暑い！.png'
  };
  return {
    text: '暑さ対策必須！何を着ても暑い！',
    image: '/clothes/100_暑さ対策必須！何を着ても暑い！.png'
  };
};

function calculateClothingIndex(forecast: Forecast): ClothingIndex {
  const score = calculateClothingScore(forecast);
  return {
    index: score,
    description: getClothingDescription(score).text,
    image: getClothingDescription(score).image
  };
}

type WeatherContextType = {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  clothingIndex: ClothingIndex | null;
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

const CHIBA_CITY_ID = 120010;
const WEATHER_API_BASE_URL = `https://weather.tsukumijima.net/api/forecast/city/${CHIBA_CITY_ID}`;

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clothingIndex, setClothingIndex] = useState<ClothingIndex | null>(null);
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
        
        // 服装指数の計算
        if (data.forecasts[0]) {
          const todayForecast = data.forecasts[0];
          const clothingIndex = calculateClothingIndex(todayForecast);
          setClothingIndex(clothingIndex);
        }
        
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
