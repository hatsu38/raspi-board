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

// 予定がそのセル(1日)に属するかを、予定の半開区間[startAt, endAt)とセルの
// 半開区間[dayStart, dayEnd)が重なるかどうかで判定する。
// 終日予定はendAtが最終日翌日の0時になっている(TimeTreeのall_dayイベントの一般的な表現)ため、
// 開始日だけをdayjs().isSame(cursor, 'day')で比較すると、複数日にまたがる予定が
// 初日以外のセルに表示されなくなる。区間の重なりで判定することで、
// 時刻指定の予定(同日内に収まる)・複数日にまたがる終日予定のどちらも
// 同じロジックで正しく扱える。
function eventOccursOnDay(event: ScheduleEvent, day: Dayjs): boolean {
  const dayStart = day.startOf('day');
  const dayEnd = dayStart.add(1, 'day');
  const eventStart = dayjs(event.startAt);
  const eventEnd = dayjs(event.endAt);
  return eventStart.isBefore(dayEnd) && eventEnd.isAfter(dayStart);
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
      events: events.filter((event) => eventOccursOnDay(event, cursor)),
    });
    cursor = cursor.add(1, 'day');
  }
  return cells;
}
