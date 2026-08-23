import dayjs from '../_libs/dayjsJa';
import { groupHourlyForecastByDay } from './hourlyForecastGrouping';
import type { HourlyForecast } from '../types/weather';

function createHourlyForecast(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time: '2026-08-23T00:00',
    temperature: 20,
    precipitationProbability: 0,
    weatherCode: 0,
    ...overrides,
  };
}

describe('groupHourlyForecastByDay', () => {
  it('3時間おきの時刻だけを、日付ごとに抽出する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00' }),
      createHourlyForecast({ time: '2026-08-23T01:00' }),
      createHourlyForecast({ time: '2026-08-23T03:00' }),
      createHourlyForecast({ time: '2026-08-24T00:00' }),
      createHourlyForecast({ time: '2026-08-24T03:00' }),
      createHourlyForecast({ time: '2026-08-25T00:00' }),
    ];
    const dates = [dayjs('2026-08-23'), dayjs('2026-08-24'), dayjs('2026-08-25')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result[0].map((f) => f.time)).toEqual(['2026-08-23T00:00', '2026-08-23T03:00']);
    expect(result[1].map((f) => f.time)).toEqual(['2026-08-24T00:00', '2026-08-24T03:00']);
    expect(result[2].map((f) => f.time)).toEqual(['2026-08-25T00:00']);
  });

  it('該当する日付のデータが1件もない場合は空配列を返す', () => {
    const hourly: HourlyForecast[] = [createHourlyForecast({ time: '2026-08-23T00:00' })];
    const dates = [dayjs('2026-08-30')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result).toEqual([[]]);
  });

  it('各要素の温度・降水確率・天気コードもそのまま保持する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({
        time: '2026-08-23T09:00',
        temperature: 27.4,
        precipitationProbability: 40,
        weatherCode: 61,
      }),
    ];
    const dates = [dayjs('2026-08-23')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result[0]).toEqual([
      { time: '2026-08-23T09:00', temperature: 27.4, precipitationProbability: 40, weatherCode: 61 },
    ]);
  });
});
