import { render, screen } from '@testing-library/react';
import dayjs from '../_libs/dayjsJa';
import { WeatherDetail } from './WeatherDetail';
import { useHourlyWeather } from '../_contexts/HourlyWeatherContext';
import type { HourlyForecast } from '../types/weather';

jest.mock('../_contexts/HourlyWeatherContext', () => ({
  useHourlyWeather: jest.fn(),
}));

const mockUseHourlyWeather = useHourlyWeather as jest.Mock;

function createHourlyForecast(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time: '2026-08-23T00:00',
    temperature: 24,
    precipitationProbability: 10,
    weatherCode: 0,
    ...overrides,
  };
}

describe('WeatherDetail', () => {
  // 2026-08-23は日曜日、24日は月曜日、25日は火曜日
  const dates = [dayjs('2026-08-23'), dayjs('2026-08-24'), dayjs('2026-08-25')];

  it('ローディング中はスピナーを表示する', () => {
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: null, loading: true, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('エラー時はエラーメッセージを表示する', () => {
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: null, loading: false, error: '取得失敗' });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('取得失敗')).toBeInTheDocument();
  });

  it('3日分の日付見出しを表示する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00' }),
      createHourlyForecast({ time: '2026-08-23T03:00' }),
      createHourlyForecast({ time: '2026-08-24T00:00' }),
      createHourlyForecast({ time: '2026-08-24T03:00' }),
      createHourlyForecast({ time: '2026-08-25T00:00' }),
      createHourlyForecast({ time: '2026-08-25T03:00' }),
    ];
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: hourly, loading: false, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('今日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('明日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('明後日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('8/23(日)')).toBeInTheDocument();
    expect(screen.getByText('8/24(月)')).toBeInTheDocument();
    expect(screen.getByText('8/25(火)')).toBeInTheDocument();
  });

  it('各日の降水確率を%表示する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00', precipitationProbability: 40 }),
      createHourlyForecast({ time: '2026-08-24T00:00', precipitationProbability: 5 }),
      createHourlyForecast({ time: '2026-08-25T00:00', precipitationProbability: 0 }),
    ];
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: hourly, loading: false, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
