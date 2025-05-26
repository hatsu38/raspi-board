export type Forecast = {
  date: string;
  telop: string;
  temperature: {
    max?: { celsius: string };
    min?: { celsius: string };
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
