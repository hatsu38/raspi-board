// WeatherContext.tsx が実際にfetchするエンドポイント。クエリの有無に関わらず
// マッチさせるため、page.route()にはglobパターンとして渡す。
export const WEATHER_API_URL_PATTERN = '**/api/forecast/city/120010**';

// 実際のAPI(https://weather.tsukumijima.net/api/forecast/city/120010)の
// レスポンスを curl で取得し、日付・気温・降水確率など検証に必要な値だけを
// 差し替えて作成した固定レスポンス。フィールドは実レスポンスと同じ構造を保つ。
//
// forecasts[0](今日 2026-08-13 木)は、服装指数が
// 「半袖Tシャツ一枚で過ごせる暑さ」になるよう最高/最低気温を調整している
// (feelsLike = 25*0.65+25*0.35 = 25℃ → アンカー一致でスコア72 → 晴れ+2 → 74)。
export const WEATHER_MOCK = {
  publicTime: '2026-08-13T17:00:00+09:00',
  publicTimeFormatted: '2026/08/13 17:00:00',
  publishingOffice: '銚子地方気象台',
  title: '千葉県 千葉 の天気',
  link: 'https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=120000',
  description: {
    publicTime: '2026-08-13T16:42:00+09:00',
    publicTimeFormatted: '2026/08/13 16:42:00',
    headlineText: '',
    bodyText: 'E2Eテスト用の固定データ',
    text: 'E2Eテスト用の固定データ',
  },
  forecasts: [
    {
      date: '2026-08-13',
      dateLabel: '今日',
      telop: '晴れ',
      detail: { weather: '晴れ', wind: '南の風', wave: '0.5メートル' },
      temperature: {
        min: { celsius: '25', fahrenheit: '77' },
        max: { celsius: '25', fahrenheit: '77' },
      },
      chanceOfRain: { T00_06: '0%', T06_12: '10%', T12_18: '10%', T18_24: '0%' },
      image: { title: '晴れ', url: 'https://www.jma.go.jp/bosai/forecast/img/100.svg', width: 80, height: 60 },
    },
    {
      date: '2026-08-14',
      dateLabel: '明日',
      telop: '曇時々雨',
      detail: { weather: 'くもり 時々 雨', wind: '北東の風', wave: '1メートル' },
      temperature: {
        min: { celsius: '24', fahrenheit: '75.2' },
        max: { celsius: '29', fahrenheit: '84.2' },
      },
      chanceOfRain: { T00_06: '70%', T06_12: '70%', T12_18: '50%', T18_24: '40%' },
      image: { title: '曇時々雨', url: 'https://www.jma.go.jp/bosai/forecast/img/202.svg', width: 80, height: 60 },
    },
    {
      date: '2026-08-15',
      dateLabel: '明後日',
      telop: '曇り',
      detail: { weather: 'くもり', wind: '東の風', wave: '0.5メートル' },
      temperature: {
        min: { celsius: '24', fahrenheit: '75.2' },
        max: { celsius: '28', fahrenheit: '82.4' },
      },
      chanceOfRain: { T00_06: '30%', T06_12: '30%', T12_18: '30%', T18_24: '30%' },
      image: { title: '曇り', url: 'https://www.jma.go.jp/bosai/forecast/img/200.svg', width: 80, height: 60 },
    },
  ],
  location: { area: '関東', prefecture: '千葉県', district: '北西部', city: '千葉' },
  copyright: {
    title: '(C) 天気予報 API(livedoor 天気互換)',
    link: 'https://weather.tsukumijima.net/',
    image: {
      title: '天気予報 API(livedoor 天気互換)',
      link: 'https://weather.tsukumijima.net/',
      url: 'https://weather.tsukumijima.net/logo.png',
      width: 120,
      height: 120,
    },
    provider: [
      {
        link: 'https://www.jma.go.jp/jma/',
        name: '気象庁 Japan Meteorological Agency',
        note: '気象庁 HP にて配信されている天気予報を JSON データへ編集しています。',
      },
    ],
  },
};

// HourlyWeatherContext.tsx が実際にfetchするエンドポイント。
export const OPEN_METEO_API_URL_PATTERN = '**/v1/forecast**';

// WEATHER_MOCK と同じ3日分(2026-08-13/14/15)の1時間ごとのデータを
// その場で組み立てる。各日の気温は WEATHER_MOCK の最高気温に寄せ、
// 正午をピークにした山型にする。降水確率と天気コードは
// telop(晴れ/曇時々雨/曇り)に対応させている。
const HOURLY_DAYS = ['2026-08-13', '2026-08-14', '2026-08-15'];
const HOURLY_PEAK_TEMPERATURE_BY_DAY = [25, 29, 28];
const HOURLY_PRECIPITATION_PROBABILITY_BY_DAY = [10, 60, 30];
const HOURLY_WEATHERCODE_BY_DAY = [0, 61, 3];

const OPEN_METEO_TIMES: string[] = [];
const OPEN_METEO_TEMPERATURES: number[] = [];
const OPEN_METEO_PRECIPITATION_PROBABILITIES: number[] = [];
const OPEN_METEO_WEATHERCODES: number[] = [];

HOURLY_DAYS.forEach((day, dayIndex) => {
  for (let hour = 0; hour < 24; hour++) {
    const distanceFromNoon = Math.abs(hour - 12);
    OPEN_METEO_TIMES.push(`${day}T${String(hour).padStart(2, '0')}:00`);
    OPEN_METEO_TEMPERATURES.push(HOURLY_PEAK_TEMPERATURE_BY_DAY[dayIndex] - distanceFromNoon * 0.3);
    OPEN_METEO_PRECIPITATION_PROBABILITIES.push(HOURLY_PRECIPITATION_PROBABILITY_BY_DAY[dayIndex]);
    OPEN_METEO_WEATHERCODES.push(HOURLY_WEATHERCODE_BY_DAY[dayIndex]);
  }
});

export const OPEN_METEO_MOCK = {
  hourly: {
    time: OPEN_METEO_TIMES,
    temperature_2m: OPEN_METEO_TEMPERATURES,
    precipitation_probability: OPEN_METEO_PRECIPITATION_PROBABILITIES,
    weathercode: OPEN_METEO_WEATHERCODES,
  },
};
