import { Forecast } from '../types/weather';

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
  if (avgTemp <= 0)   return 5;   // 厳冬：ほぼ何を着ても寒い
  if (avgTemp <= 5)   return 15;  // 厚手コート＋ニット必須
  if (avgTemp <= 10)  return 25;  // コート＋セーター
  if (avgTemp <= 15)  return 35;  // トレンチコート／ライトコート
  if (avgTemp <= 20)  return 50;  // 薄手ジャケット／カーディガン
  if (avgTemp <= 25)  return 65;  // 長袖シャツ／カットソー
  if (avgTemp <= 30)  return 80;  // 半袖Tシャツ
  if (avgTemp <= 35)  return 90;  // ノースリーブも可
  return 100; // 真夏装備
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

type ChanceOfRain = Record<'T00_06'|'T06_12'|'T12_18'|'T18_24', string>;

const getCommuteRainChance = (chance: ChanceOfRain): number => {
  const m = parseInt(chance.T06_12) || 0; // 朝
  const e = parseInt(chance.T12_18) || 0; // 夕方
  return (m + e) / 2;
};

export function calculateClothingScore(forecast: Forecast): number {
  const date = new Date(forecast.date);
  const month = date.getMonth() + 1;
  const { max: defMax, min: defMin } = getDefaultTemperatureByMonth(month);

  const maxT = Number(forecast.temperature.max?.celsius ?? defMax);
  const minT = Number(forecast.temperature.min?.celsius ?? defMin);
  const avgTemp = (maxT + minT) / 2;

  // 1) 基本スコア
  let score = temperatureToScore(avgTemp);

  // 2) 天気・傘要不要の補正（通勤帯）
  const rainCommute = getCommuteRainChance(forecast.chanceOfRain);
  if (rainCommute >= 60) score -= 5;
  else if (rainCommute >= 40) score -= 3;
  else if (rainCommute >= 20) score -= 1;

  // 3) 天気柄による補正
  const w = forecast.telop;
  if (w.includes('雨'))      score -= 4;
  else if (w.includes('曇')) score -= 2;
  else if (w.includes('晴')) score += 2;

  // 4) 風・波による補正
  const wave   = parseWaveHeight(forecast.detail.wave);
  const windP  = waveToWindPenalty(wave);
  const windW  = forecast.detail.wind;
  if (windW.includes('北') || windW.includes('北東')) score -= 2;
  if (windW.includes('強い'))                      score -= 3;
  score += windP;

  // 5) 最終的に0〜100にクランプ
  return Math.max(0, Math.min(100, score));
} 
