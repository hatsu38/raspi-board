import type { ScheduleEvent } from '../../src/types/schedule';

// ScheduleContext.tsx が実際にfetchするエンドポイント。
export const TIMETREE_API_URL_PATTERN = '**/api/timetree**';

// dashboard.spec.ts の固定時刻(2026-08-13/14)の近くに1件だけ予定を置く。
// これにより、Schedule/UpcomingScheduleがエラー表示にならないことに加えて、
// scheduleモードのアサーションで予定タイトルが実際に画面に出ることまで確認できる。
export const TIMETREE_MOCK: { events: ScheduleEvent[] } = {
  events: [
    {
      id: 'e2e-event-1',
      title: '健診',
      startAt: '2026-08-14T09:00:00+09:00',
      endAt: '2026-08-14T10:00:00+09:00',
      allDay: false,
    },
  ],
};
