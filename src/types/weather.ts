export type Forecast = {
  date: string;
  telop: string;
  temperature: {
    // 当日の最高/最低気温は、その時刻を過ぎるとAPIがnullを返すようになる
    // (例: 最高気温は正午過ぎ、最低気温は未明を過ぎると観測済み扱いになりnull)
    max?: { celsius: string | null };
    min?: { celsius: string | null };
  };
  chanceOfRain: {
    T00_06: string;
    T06_12: string;
    T12_18: string;
    T18_24: string;
  };
  image?: {
    url: string;
  };
  detail: {
    wave: string;
    wind: string;
  };
};

export type WeatherData = {
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

export type ClothingIndex = {
  index: number;
  description: string;
  image: string;
};

export type HourlyForecast = {
  time: string; // ISO8601 (Asia/Tokyo, 例: "2026-08-23T09:00")
  temperature: number;
  precipitationProbability: number;
  weatherCode: number; // WMO weather code
};
