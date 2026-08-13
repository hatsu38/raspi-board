export type WeatherIconKind =
  | 'sunny'
  | 'sunny-cloudy'
  | 'cloudy'
  | 'cloudy-rain'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunder';

type PrimaryWeather = 'sunny' | 'cloudy' | 'rain';

/*
 * telop の先頭に来る語がその日の主たる天気。
 * 「晴時々曇」なら晴が主、「曇時々晴」なら曇が主になる。
 */
const PRIMARY_PREFIXES: { prefix: string; primary: PrimaryWeather }[] = [
  { prefix: '晴', primary: 'sunny' },
  { prefix: '曇', primary: 'cloudy' },
  { prefix: 'くもり', primary: 'cloudy' },
  { prefix: '雨', primary: 'rain' },
];

function getPrimaryWeather(telop: string): PrimaryWeather | null {
  return PRIMARY_PREFIXES.find(({ prefix }) => telop.startsWith(prefix))?.primary ?? null;
}

/**
 * 天気 API の telop から自作アイコンの種類を決める。
 * 判定できない telop では null を返し、呼び出し側が API の公式アイコンに
 * フォールバックする。未知の文言でアイコンが消えないようにするため。
 */
export function getWeatherIconKind(telop: string): WeatherIconKind | null {
  if (!telop) return null;

  // 激しい天気は主従に関係なくそれ自体を示したいので先に判定する
  if (telop.includes('雷')) return 'thunder';
  if (telop.includes('雪')) return 'snow';
  if (telop.includes('大雨') || telop.includes('暴風雨')) return 'heavy-rain';

  const primary = getPrimaryWeather(telop);
  if (!primary) return null;

  if (primary === 'rain') return 'rain';

  // 主は晴/曇でも雨を含むなら(「晴一時雨」「曇時々雨」)傘の要否が伝わる方を優先する
  if (telop.includes('雨')) return 'cloudy-rain';

  if (primary === 'cloudy') return 'cloudy';

  return telop.includes('曇') ? 'sunny-cloudy' : 'sunny';
}
