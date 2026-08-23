import type { Dayjs } from 'dayjs';
import type { HourlyForecast } from '../types/weather';

const SLOT_INTERVAL_HOURS = 3;

/**
 * 1時間ごとの予報配列を、指定した日付ごとに3時間おき(0,3,6,...,21時)へ間引く。
 * スクロールできない画面に収めるための間引きで、今日・明日・明後日とも同じ間隔にする。
 */
export function groupHourlyForecastByDay(
  hourly: HourlyForecast[],
  dates: Dayjs[]
): HourlyForecast[][] {
  return dates.map((date) => {
    const dateKey = date.format('YYYY-MM-DD');
    return hourly.filter((entry) => {
      if (!entry.time.startsWith(dateKey)) return false;
      const hour = Number(entry.time.slice(11, 13));
      return hour % SLOT_INTERVAL_HOURS === 0;
    });
  });
}
