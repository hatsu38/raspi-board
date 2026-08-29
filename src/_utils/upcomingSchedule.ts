import type { Dayjs } from 'dayjs';
import dayjs from '../_libs/dayjsJa';
import type { ScheduleEvent } from '../types/schedule';

export type UpcomingItem = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string | null;
};

export function pickUpcomingEvents(
  events: ScheduleEvent[],
  now: Dayjs,
  count: number
): UpcomingItem[] {
  const startOfToday = now.startOf('day');

  return events
    .filter((event) => dayjs(event.endAt).isSameOrAfter(startOfToday))
    .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf())
    .slice(0, count)
    .map((event) => {
      const start = dayjs(event.startAt);
      return {
        id: event.id,
        title: event.title,
        dateLabel: `${start.format('M/D')}(${start.format('ddd')})`,
        timeLabel: event.allDay ? null : start.format('H:mm'),
      };
    });
}
