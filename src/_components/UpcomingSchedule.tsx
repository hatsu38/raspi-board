'use client';

import { Dayjs } from 'dayjs';
import { useSchedule } from '../_contexts/ScheduleContext';
import { pickUpcomingEvents } from '../_utils/upcomingSchedule';

const UPCOMING_COUNT = 5;

type UpcomingScheduleProps = {
  now: Dayjs;
};

export function UpcomingSchedule({ now }: UpcomingScheduleProps) {
  const { events, loading, error } = useSchedule();

  if (!events) {
    if (loading) {
      return (
        <section className="panel flex min-h-0 flex-col items-center justify-center p-[2vh]">
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-accent"></div>
        </section>
      );
    }
    if (error) {
      return (
        <section className="panel flex min-h-0 flex-col items-center justify-center p-[2vh]">
          <p className="fs-md text-hot">{error}</p>
        </section>
      );
    }
    return null;
  }

  const items = pickUpcomingEvents(events, now, UPCOMING_COUNT);

  return (
    <section className="panel flex min-h-0 flex-col p-[2vh]">
      <h3 className="card-title fs-sm shrink-0 self-center font-bold">よてい</h3>
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="fs-md font-medium text-ink-faint">予定はありません</p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-center gap-[1vh] overflow-hidden">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-[1.2vh]">
              <span className="fs-xs shrink-0 text-ink-faint">{item.dateLabel}</span>
              {item.timeLabel && (
                <span className="fs-schedule-time shrink-0 font-bold text-accent-ink">
                  {item.timeLabel}
                </span>
              )}
              <span className="fs-schedule-title truncate font-bold leading-tight text-ink">
                {item.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
