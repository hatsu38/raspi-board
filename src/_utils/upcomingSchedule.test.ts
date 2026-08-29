import dayjs from '../_libs/dayjsJa';
import { pickUpcomingEvents } from './upcomingSchedule';
import type { ScheduleEvent } from '../types/schedule';

describe('pickUpcomingEvents', () => {
  const now = dayjs('2026-08-28T10:00:00+09:00');

  it('終了済みの予定は除外する', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '昨日の予定',
        startAt: '2026-08-27T09:00:00+09:00',
        endAt: '2026-08-27T10:00:00+09:00',
        allDay: false,
      },
      {
        id: '2',
        title: '今日の予定',
        startAt: '2026-08-28T15:00:00+09:00',
        endAt: '2026-08-28T16:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result.map((item) => item.id)).toEqual(['2']);
  });

  it('開始時刻が早い順に並べる', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '遅い予定',
        startAt: '2026-08-30T18:00:00+09:00',
        endAt: '2026-08-30T19:00:00+09:00',
        allDay: false,
      },
      {
        id: '2',
        title: '早い予定',
        startAt: '2026-08-29T09:00:00+09:00',
        endAt: '2026-08-29T10:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result.map((item) => item.id)).toEqual(['2', '1']);
  });

  it('countで指定した件数に絞る', () => {
    const events: ScheduleEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      title: `予定${i}`,
      startAt: now.add(i, 'day').toISOString(),
      endAt: now.add(i, 'day').add(1, 'hour').toISOString(),
      allDay: false,
    }));

    const result = pickUpcomingEvents(events, now, 5);

    expect(result).toHaveLength(5);
  });

  it('終日予定はtimeLabelがnullになる', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '実家帰省',
        startAt: '2026-08-29T00:00:00+09:00',
        endAt: '2026-08-30T00:00:00+09:00',
        allDay: true,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result[0].timeLabel).toBeNull();
  });

  it('時間指定の予定はH:mm形式のtimeLabelとdateLabelを持つ', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '健診',
        startAt: '2026-08-29T09:05:00+09:00',
        endAt: '2026-08-29T10:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result[0].timeLabel).toBe('9:05');
    expect(result[0].dateLabel).toBe('8/29(土)');
  });
});
