import type { Dayjs } from 'dayjs';
import dayjs from '../_libs/dayjsJa';
import type { ScheduleEvent } from '../types/schedule';

export type MonthGridCell = {
  date: Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ScheduleEvent[];
};

// 週の始まりを月曜日にする(dayjsの.day()は日曜=0始まりのため、月曜=0になるよう補正する)
function mondayOffset(date: Dayjs): number {
  return (date.day() + 6) % 7;
}

export function buildMonthGrid(
  baseDate: Dayjs,
  events: ScheduleEvent[],
  today: Dayjs = dayjs()
): MonthGridCell[] {
  const startOfMonth = baseDate.startOf('month');
  const endOfMonth = baseDate.endOf('month');
  const gridStart = startOfMonth.subtract(mondayOffset(startOfMonth), 'day');
  const gridEnd = endOfMonth.add(6 - mondayOffset(endOfMonth), 'day');

  const cells: MonthGridCell[] = [];
  let cursor = gridStart;
  while (cursor.isSameOrBefore(gridEnd, 'day')) {
    cells.push({
      date: cursor,
      isCurrentMonth: cursor.isSame(baseDate, 'month'),
      isToday: cursor.isSame(today, 'day'),
      events: events.filter((event) => dayjs(event.startAt).isSame(cursor, 'day')),
    });
    cursor = cursor.add(1, 'day');
  }
  return cells;
}
