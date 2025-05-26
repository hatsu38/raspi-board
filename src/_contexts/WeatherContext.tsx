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

type Forecast = WeatherData['forecasts'][0];

type ClothingIndex = {
  index: number;
  description: string;
  image: string;
};

const parseWaveHeight = (wave: string): number => {
  const match = wave.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const waveToWindPenalty = (wave: number): number => {
  if (wave >= 3) return -5;
  if (wave >= 2) return -3;
  if (wave >= 1) return -1;
  return 0;
};

const temperatureToScore = (avgTemp: number): number => {
  if (avgTemp <= 0) return 5;
  if (avgTemp <= 5) return 10;
  if (avgTemp <= 10) return 20;
  if (avgTemp <= 15) return 30;
  if (avgTemp <= 20) return 40;
  if (avgTemp <= 23) return 50;
  if (avgTemp <= 26) return 60;
  if (avgTemp <= 29) return 70;
  if (avgTemp <= 32) return 80;
  if (avgTemp <= 35) return 90;
  return 100;
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

const getDefaultTemperatureByMonth = (month: number): { max: number; min: number } => {
  switch (month) {
    case 1: return { max: 7, min: 1 };   // January
    case 2: return { max: 8, min: 1 };   // February
    case 3: return { max: 13, min: 5 };  // March
    case 4: return { max: 18, min: 10 }; // April
    case 5: return { max: 23, min: 15 }; // May
    case 6: return { max: 26, min: 18 }; // June
    case 7: return { max: 30, min: 23 }; // July
    case 8: return { max: 32, min: 24 }; // August
    case 9: return { max: 28, min: 21 }; // September
    case 10: return { max: 22, min: 15 }; // October
    case 11: return { max: 16, min: 9 }; // November
    case 12: return { max: 11, min: 4 }; // December
    default: return { max: 20, min: 10 }; // fallback
  }
};


function calculateClothingIndex(forecast: Forecast): ClothingIndex {
  const dateObj = new Date(forecast.date);
  const month = dateObj.getMonth() + 1;

  const defaultTemp = getDefaultTemperatureByMonth(month);
  
  const maxTemp = Number(forecast.temperature.max?.celsius ?? defaultTemp.max);
  const minTemp = Number(forecast.temperature.min?.celsius ?? defaultTemp.min);
  const avgTemp = (maxTemp + minTemp) / 2;

  let score = temperatureToScore(avgTemp);

  const weather = forecast.telop;
  const wave = parseWaveHeight(forecast.detail.wave);
  const windPenalty = waveToWindPenalty(wave);

  const wind = forecast.detail.wind;
  const chanceOfRain = Object.values(forecast.chanceOfRain).map(r => parseInt(r) || 0);
  const rainAvg = chanceOfRain.length ? (chanceOfRain.reduce((a, b) => a + b) / chanceOfRain.length) : 0;

  // スコア補正
  if (weather.includes('雨')) score -= 5;
  else if (weather.includes('曇')) score -= 2;
  else if (weather.includes('晴')) score += 2;

  if (wind.includes('北') || wind.includes('北東')) score -= 2;
  if (wind.includes('強い')) score -= 3;

  score += windPenalty;

  if (rainAvg >= 50) score -= 3;
  else if (rainAvg >= 30) score -= 1;

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    index: finalScore,
    description: getClothingDescription(finalScore).text,
    image: getClothingDescription(finalScore).image
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
