'use client';

import { Dayjs } from 'dayjs';
import { useSchedule } from '../_contexts/ScheduleContext';
import { buildMonthGrid } from '../_utils/monthGrid';

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const MAX_VISIBLE_EVENTS_PER_CELL = 2;

type ScheduleProps = {
  today: Dayjs;
};

export function Schedule({ today }: ScheduleProps) {
  const { events, loading, error } = useSchedule();

  if (!events) {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-accent"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="fs-md text-hot">{error}</p>
        </div>
      );
    }
    return null;
  }

  const cells = buildMonthGrid(today, events, today);
  const rowCount = cells.length / 7;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[1vh]">
      <h2 className="card-title fs-md shrink-0 self-start font-bold">
        よてい {today.format('YYYY年M月')}
      </h2>
      <div className="grid shrink-0 grid-cols-7 gap-[0.4vh]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="fs-2xs text-center font-bold text-ink-faint">
            {label}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-[0.4vh]"
        style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.date.format('YYYY-MM-DD')}
            className={`flex min-h-0 flex-col gap-[0.2vh] rounded-[0.8vh] p-[0.6vh] ${
              cell.isToday ? 'panel-accent' : cell.isCurrentMonth ? 'bg-soft' : ''
            }`}
          >
            <span
              className={`fs-2xs font-bold ${
                cell.isCurrentMonth ? 'text-ink-soft' : 'text-ink-faint opacity-50'
              }`}
            >
              {cell.date.date()}
            </span>
            {cell.events.slice(0, MAX_VISIBLE_EVENTS_PER_CELL).map((event) => (
              <span
                key={event.id}
                className="fs-2xs truncate rounded-[0.4vh] bg-accent px-[0.4vh] text-on-accent"
              >
                {event.title}
              </span>
            ))}
            {cell.events.length > MAX_VISIBLE_EVENTS_PER_CELL && (
              <span className="fs-2xs text-ink-faint">
                +{cell.events.length - MAX_VISIBLE_EVENTS_PER_CELL}件
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
