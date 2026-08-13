import { Forecast } from '../types/weather';

const CLOTHING_DESCRIPTIONS = [
  { threshold: 10, text: 'ぶるぶる、何を着ても寒い！', image: '/clothes/10.png' },
  { threshold: 20, text: 'ダウンジャケットでしっかり防寒', image: '/clothes/20.png' },
  { threshold: 30, text: 'コートを着ないと結構寒いなあ', image: '/clothes/30.png' },
  { threshold: 40, text: '裏地付トレンチコートがおすすめ', image: '/clothes/40.png' },
  { threshold: 50, text: '薄手のジャケットを羽織ろう', image: '/clothes/50.png' },
  { threshold: 60, text: '長袖シャツ・カットソーで快適に', image: '/clothes/60.png' },
  { threshold: 70, text: '半袖＋カーディガンで温度調節を', image: '/clothes/70.png' },
  { threshold: 80, text: '半袖Tシャツ一枚で過ごせる暑さ', image: '/clothes/80.png' },
  { threshold: 90, text: 'ノースリーブでもかなり暑い！', image: '/clothes/90.png' },
  { threshold: 100, text: '暑さ対策必須！何を着ても暑い！', image: '/clothes/100.png' }
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

// 人は一日の大半を最高気温に近い日中に活動するため、最高/最低の単純平均より
// 最高気温寄りに重み付けした方が体感に近づく
// (例: 最高30℃・最低15℃の日を単純平均22.5℃として扱うと、
//  日中の暑さが服装の目安に反映されにくい)
const MAX_TEMPERATURE_WEIGHT = 0.65;

const getFeelsLikeTemperature = (maxCelsius: number, minCelsius: number): number =>
  maxCelsius * MAX_TEMPERATURE_WEIGHT + minCelsius * (1 - MAX_TEMPERATURE_WEIGHT);

// 気温とスコアの対応アンカー。段階的な閾値(5℃刻みで固定スコア)だと
// 例えば21℃と24℃が同じ帯に入り同じ服装指数になってしまうため、
// アンカー間を線形補間して1℃単位の変化にも滑らかに反応するようにする
const TEMPERATURE_SCORE_ANCHORS: ReadonlyArray<readonly [temperature: number, score: number]> = [
  [-5, 0],
  [0, 10],
  [5, 20],
  [10, 32],
  [15, 45],
  [20, 58],
  [25, 72],
  [30, 85],
  [35, 95],
  [40, 100],
];

const getTemperatureScore = (temp: number): number => {
  const first = TEMPERATURE_SCORE_ANCHORS[0];
  const last = TEMPERATURE_SCORE_ANCHORS[TEMPERATURE_SCORE_ANCHORS.length - 1];
  if (temp <= first[0]) return first[1];
  if (temp >= last[0]) return last[1];

  for (let i = 0; i < TEMPERATURE_SCORE_ANCHORS.length - 1; i++) {
    const [lowTemp, lowScore] = TEMPERATURE_SCORE_ANCHORS[i];
    const [highTemp, highScore] = TEMPERATURE_SCORE_ANCHORS[i + 1];
    if (temp <= highTemp) {
      const ratio = (temp - lowTemp) / (highTemp - lowTemp);
      return lowScore + (highScore - lowScore) * ratio;
    }
  }
  return last[1];
};

// 外出の主な時間帯である06-12/12-18のうち、降水確率が高い方を採用する
// (どちらか一方だけ荒れる日でも、傘や上着の要否は無視できないため)
const getRainPenalty = (chancePercent: number): number => {
  if (chancePercent >= 70) return -6;
  if (chancePercent >= 50) return -4;
  if (chancePercent >= 30) return -2;
  return 0;
};

const getWeatherPenalty = (telop: string): number => {
  if (telop.includes('雪')) return -6;
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

  if (wind.includes('北')) penalty -= 2;
  if (wind.includes('強')) penalty -= 3;

  return penalty;
};

const parseWaveHeight = (wave: string): number => {
  const match = wave.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const parseChanceOfRain = (chance: string): number => {
  const value = parseInt(chance);
  return Number.isNaN(value) ? 0 : value;
};

export function calculateClothingScore(forecast: Forecast): number {
  const date = new Date(forecast.date);
  const month = date.getMonth() + 1;
  const defaultTemp = MONTHLY_TEMPERATURES[month as keyof typeof MONTHLY_TEMPERATURES] || { max: 20, min: 10 };

  const maxT = Number(forecast.temperature.max?.celsius ?? defaultTemp.max);
  const minT = Number(forecast.temperature.min?.celsius ?? defaultTemp.min);
  const feelsLikeTemp = getFeelsLikeTemperature(maxT, minT);

  const daytimeRainChance = Math.max(
    parseChanceOfRain(forecast.chanceOfRain.T06_12),
    parseChanceOfRain(forecast.chanceOfRain.T12_18)
  );

  let score = getTemperatureScore(feelsLikeTemp);
  score += getRainPenalty(daytimeRainChance);
  score += getWeatherPenalty(forecast.telop);
  score += getWindPenalty(parseWaveHeight(forecast.detail.wave), forecast.detail.wind);

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function getClothingDescription(score: number) {
  const description = CLOTHING_DESCRIPTIONS.find(d => score <= d.threshold) || CLOTHING_DESCRIPTIONS[CLOTHING_DESCRIPTIONS.length - 1];
  return {
    index: score,
    description: description.text,
    image: description.image
  };
}
