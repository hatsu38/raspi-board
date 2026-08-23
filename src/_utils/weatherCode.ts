import type { WeatherIconKind } from './weatherIcon';

type WeatherCodeMapping = { kind: WeatherIconKind; label: string };

// Open-Meteo が返す WMO weather code の対応表
// (https://open-meteo.com/en/docs で定義されている値のみを対象にする)
const WEATHER_CODE_TO_MAPPING: Record<number, WeatherCodeMapping> = {
  0: { kind: 'sunny', label: '晴れ' },
  1: { kind: 'sunny-cloudy', label: 'ほぼ晴れ' },
  2: { kind: 'sunny-cloudy', label: '晴れ時々曇り' },
  3: { kind: 'cloudy', label: '曇り' },
  45: { kind: 'cloudy', label: '霧' },
  48: { kind: 'cloudy', label: '霧' },
  51: { kind: 'cloudy-rain', label: '弱い霧雨' },
  53: { kind: 'cloudy-rain', label: '霧雨' },
  55: { kind: 'rain', label: '強い霧雨' },
  56: { kind: 'cloudy-rain', label: '弱い着氷性の霧雨' },
  57: { kind: 'rain', label: '着氷性の霧雨' },
  61: { kind: 'cloudy-rain', label: '弱い雨' },
  63: { kind: 'rain', label: '雨' },
  65: { kind: 'heavy-rain', label: '強い雨' },
  66: { kind: 'cloudy-rain', label: '弱い着氷性の雨' },
  67: { kind: 'heavy-rain', label: '着氷性の雨' },
  71: { kind: 'snow', label: '弱い雪' },
  73: { kind: 'snow', label: '雪' },
  75: { kind: 'snow', label: '強い雪' },
  77: { kind: 'snow', label: '雪(霧雪)' },
  80: { kind: 'cloudy-rain', label: '弱いにわか雨' },
  81: { kind: 'rain', label: 'にわか雨' },
  82: { kind: 'heavy-rain', label: '強いにわか雨' },
  85: { kind: 'snow', label: '弱いにわか雪' },
  86: { kind: 'snow', label: '強いにわか雪' },
  95: { kind: 'thunder', label: '雷雨' },
  96: { kind: 'thunder', label: '雷雨(弱い雹)' },
  99: { kind: 'thunder', label: '雷雨(強い雹)' },
};

const FALLBACK_MAPPING: WeatherCodeMapping = { kind: 'cloudy', label: '不明' };

/**
 * Open-Meteo の WMO weather code から自作アイコンの種類を決める。
 * telop ベースの getWeatherIconKind と異なり、コードは既知の有限集合のため
 * 未知の値でも null を返さず 'cloudy' にフォールバックする。
 */
export function getWeatherIconKindFromCode(code: number): WeatherIconKind {
  return (WEATHER_CODE_TO_MAPPING[code] ?? FALLBACK_MAPPING).kind;
}

/** aria-label などに使う日本語ラベル */
export function getWeatherLabelFromCode(code: number): string {
  return (WEATHER_CODE_TO_MAPPING[code] ?? FALLBACK_MAPPING).label;
}
