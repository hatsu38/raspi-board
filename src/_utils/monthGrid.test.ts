import dayjs from '../_libs/dayjsJa';
import { buildMonthGrid } from './monthGrid';
import type { ScheduleEvent } from '../types/schedule';

describe('buildMonthGrid', () => {
  it('月曜始まりの週単位で、月の最初と最後を含むグリッドを作る', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), []);

    expect(cells[0].date.format('ddd')).toBe('月');
    expect(cells[cells.length - 1].date.format('ddd')).toBe('日');
    expect(cells.length % 7).toBe(0);
  });

  it('対象月以外の日付はisCurrentMonthがfalseになる', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), []);

    const julyCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-07-31');
    expect(julyCell?.isCurrentMonth).toBe(false);

    const augustCell = cells.find((cell) => cell.date.date() === 15 && cell.date.month() === 7);
    expect(augustCell?.isCurrentMonth).toBe(true);
  });

  it('todayに指定した日付のセルだけisTodayがtrueになる', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), [], dayjs('2026-08-04'));

    const targetCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-04');
    expect(targetCell?.isToday).toBe(true);

    const otherCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-05');
    expect(otherCell?.isToday).toBe(false);
  });

  it('該当日の予定だけをそのセルに紐づける', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '健診',
        startAt: '2026-08-04T09:00:00+09:00',
        endAt: '2026-08-04T10:00:00+09:00',
        allDay: false,
      },
    ];

    const cells = buildMonthGrid(dayjs('2026-08-15'), events);

    const targetCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-04');
    expect(targetCell?.events.map((e) => e.id)).toEqual(['1']);

    const otherCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-05');
    expect(otherCell?.events).toEqual([]);
  });
});
