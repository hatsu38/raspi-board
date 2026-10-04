import { render, screen } from '@testing-library/react';
import dayjs from '../_libs/dayjsJa';
import { Weather } from './Weather';
import { useWeather } from '../_contexts/WeatherContext';
import { useTime } from '../_contexts/TimeContext';
import type { Forecast, WeatherData } from '../types/weather';

jest.mock('../_contexts/WeatherContext', () => ({
  useWeather: jest.fn(),
}));

jest.mock('../_contexts/TimeContext', () => ({
  useTime: jest.fn(),
}));

const mockUseWeather = useWeather as jest.Mock;
const mockUseTime = useTime as jest.Mock;

function createForecast(date: string): Forecast {
  return {
    date,
    dateLabel: '',
    telop: '晴れ',
    detail: { weather: '晴れ', wind: '', wave: '' },
    temperature: { max: { celsius: '25' }, min: { celsius: '20' } },
    chanceOfRain: { T00_06: '0%', T06_12: '10%', T12_18: '10%', T18_24: '0%' },
  } as Forecast;
}

const weather = {
  forecasts: [createForecast('2026-10-04'), createForecast('2026-10-05'), createForecast('2026-10-06')],
} as WeatherData;

describe('Weather の最終更新表示', () => {
  const now = dayjs('2026-10-04T12:00:00');
  const dates = [now, now.add(1, 'day'), now.add(2, 'day')];

  beforeEach(() => {
    mockUseTime.mockReturnValue({ time: now });
  });

  it('直近に取得できていれば最終更新を表示しない', () => {
    mockUseWeather.mockReturnValue({
      weather,
      loading: false,
      error: null,
      lastUpdatedAt: now.subtract(5, 'minute').valueOf(),
    });

    render(<Weather dates={dates} />);

    expect(screen.queryByText(/最終更新/)).not.toBeInTheDocument();
  });

  it('しばらく取得できていなければ最終更新の時刻を表示する', () => {
    mockUseWeather.mockReturnValue({
      weather,
      loading: false,
      error: '天気情報の取得に失敗しました',
      lastUpdatedAt: now.subtract(2, 'hour').valueOf(),
    });

    render(<Weather dates={dates} />);

    expect(screen.getByText('最終更新 10:00')).toBeInTheDocument();
  });
});
