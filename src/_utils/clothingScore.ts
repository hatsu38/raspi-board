import { Forecast } from '../types/weather';

const CLOTHING_DESCRIPTIONS = [
  { threshold: 10, text: 'ぶるぶる、何を着ても寒い！', image: '/clothes/10_ぶるぶる、何を着ても寒い！.png' },
  { threshold: 20, text: 'ダウンジャケットでしっかり防寒', image: '/clothes/20_ダウンジャケットでしっかり防寒.png' },
  { threshold: 30, text: 'コートを着ないと結構寒いなあ', image: '/clothes/30_コートを着ないと結構寒いなあ.png' },
  { threshold: 40, text: '裏地付トレンチコートがおすすめ', image: '/clothes/40_裏地付トレンチコートがおすすめ.png' },
  { threshold: 50, text: '薄手のジャケットを羽織ろう', image: '/clothes/50_薄手のジャケットを羽織ろう.png' },
  { threshold: 60, text: '長袖シャツ・カットソーで快適に', image: '/clothes/60_長袖シャツ・カットソーで快適に.png' },
  { threshold: 70, text: '半袖＋カーディガンで温度調節を', image: '/clothes/70_半袖＋カーディガンで温度調節を.png' },
  { threshold: 80, text: '半袖Tシャツ一枚で過ごせる暑さ', image: '/clothes/80_半袖Tシャツ一枚で過ごせる暑さ.png' },
  { threshold: 90, text: 'ノースリーブでもかなり暑い！', image: '/clothes/90_ノースリーブでもかなり暑い！.png' },
  { threshold: 100, text: '暑さ対策必須！何を着ても暑い！', image: '/clothes/100_暑さ対策必須！何を着ても暑い！.png' }
] as const;

const MONTHLY_TEMPERATURES = {
  1: { max: 7, min: 1 },    // January
  2: { max: 8, min: 1 },    // February
  3: { max: 13, min: 5 },   // March
  4: { max: 18, min: 10 },  // April
  5: { max: 23, min: 15 },  // May
  6: { max: 26, min: 18 },  // June
  7: { max: 30, min: 23 },  // July
  8: { max: 32, min: 24 },  // August
  9: { max: 28, min: 21 },  // September
  10: { max: 22, min: 15 }, // October
  11: { max: 16, min: 9 },  // November
  12: { max: 11, min: 4 }   // December
} as const;

const parseWaveHeight = (wave: string): number => {
  const match = wave.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const getTemperatureScore = (temp: number): number => {
  if (temp <= 0) return 5;
  if (temp <= 5) return 15;
  if (temp <= 10) return 25;
  if (temp <= 15) return 35;
  if (temp <= 20) return 50;
  if (temp <= 25) return 65;
  if (temp <= 30) return 80;
  if (temp <= 35) return 90;
  return 100;
};

const getRainPenalty = (chance: number): number => {
  if (chance >= 60) return -5;
  if (chance >= 40) return -3;
  if (chance >= 20) return -1;
  return 0;
};

const getWeatherPenalty = (telop: string): number => {
  if (telop.includes('雨')) return -4;
  if (telop.includes('曇')) return -2;
  if (telop.includes('晴')) return 2;
  return 0;
};

const getWindPenalty = (wave: number, wind: string): number => {
  let penalty = 0;
  if (wave >= 3) penalty -= 5;
  else if (wave >= 2) penalty -= 3;
  else if (wave >= 1) penalty -= 1;

  if (wind.includes('北') || wind.includes('北東')) penalty -= 2;
  if (wind.includes('強い')) penalty -= 3;

  return penalty;
};

export function calculateClothingScore(forecast: Forecast): number {
  const date = new Date(forecast.date);
  const month = date.getMonth() + 1;
  const defaultTemp = MONTHLY_TEMPERATURES[month as keyof typeof MONTHLY_TEMPERATURES] || { max: 20, min: 10 };

  const maxT = Number(forecast.temperature.max?.celsius ?? defaultTemp.max);
  const minT = Number(forecast.temperature.min?.celsius ?? defaultTemp.min);
  const avgTemp = (maxT + minT) / 2;

  let score = getTemperatureScore(avgTemp);
  score += getRainPenalty(parseInt(forecast.chanceOfRain.T06_12) || 0);
  score += getWeatherPenalty(forecast.telop);
  score += getWindPenalty(parseWaveHeight(forecast.detail.wave), forecast.detail.wind);

  return Math.max(0, Math.min(100, score));
}

export function getClothingDescription(score: number) {
  const description = CLOTHING_DESCRIPTIONS.find(d => score <= d.threshold) || CLOTHING_DESCRIPTIONS[CLOTHING_DESCRIPTIONS.length - 1];
  return {
    index: score,
    description: description.text,
    image: description.image
  };
} 
