import { fetchActiveCalendarIds, fetchAllEvents, TimeTreeCalendarError } from './calendar';
import { buildMonthGrid } from '../../_utils/monthGrid';
import dayjs from '../dayjsJa';

describe('fetchActiveCalendarIds', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('無効化されていないカレンダーのIDだけを返す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: [
          { id: 'cal-1', deactivated_at: null },
          { id: 'cal-2', deactivated_at: '2025-01-01T00:00:00Z' },
        ],
      }),
    }) as unknown as typeof fetch;

    const ids = await fetchActiveCalendarIds('session-id');

    expect(ids).toEqual(['cal-1']);
  });

  it('取得に失敗した場合はTimeTreeCalendarErrorを投げる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    await expect(fetchActiveCalendarIds('session-id')).rejects.toThrow(TimeTreeCalendarError);
  });
});

describe('fetchAllEvents', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('カレンダー一覧と予定を取得してScheduleEvent形式に整形する', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/calendars')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ calendars: [{ id: 'cal-1', deactivated_at: null }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chunk: false,
          since: 0,
          events: [
            {
              uuid: 'event-1',
              title: '健診',
              start_at: 1735689600000,
              end_at: 1735693200000,
              all_day: false,
            },
          ],
        }),
      });
    }) as unknown as typeof fetch;

    const events = await fetchAllEvents('session-id');

    expect(events).toEqual([
      {
        id: 'event-1',
        title: '健診',
        startAt: new Date(1735689600000).toISOString(),
        endAt: new Date(1735693200000).toISOString(),
        allDay: false,
      },
    ]);
  });

  it('chunkがtrueの場合は再帰的に全件取得する', async () => {
    let eventsCallCount = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/calendars')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ calendars: [{ id: 'cal-1', deactivated_at: null }] }),
        });
      }
      eventsCallCount += 1;
      if (eventsCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            chunk: true,
            since: 100,
            events: [
              {
                uuid: 'event-1',
                title: '予定1',
                start_at: 1735689600000,
                end_at: 1735693200000,
                all_day: false,
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chunk: false,
          since: 100,
          events: [
            {
              uuid: 'event-2',
              title: '予定2',
              start_at: 1735776000000,
              end_at: 1735779600000,
              all_day: false,
            },
          ],
        }),
      });
    }) as unknown as typeof fetch;

    const events = await fetchAllEvents('session-id');

    expect(events.map((e) => e.id)).toEqual(['event-1', 'event-2']);
  });
});

describe('fetchAllEvents (終日予定のタイムゾーン変換)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // JSTの終日予定「8/4」は、TimeTree上ではUTC換算で「8/3 15:00」というエポックで
  // 表現される(イベント自身のタイムゾーンで解釈した壁時計時刻をエポック化しているため)。
  // start_timezoneを無視してnew Date(epoch).toISOString()するだけだと
  // "2026-08-03T15:00:00.000Z" になり、文字列に現れる日付が実際のカレンダー日付
  // (8/4)とズレる。この食い違いを直接検証するため、あえてこのエポック値を使う。
  const startAtMs = new Date('2026-08-04T00:00:00+09:00').getTime();
  const endAtMs = new Date('2026-08-05T00:00:00+09:00').getTime();

  function mockFetchWithEvent(rawEvent: Record<string, unknown>) {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/calendars')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ calendars: [{ id: 'cal-1', deactivated_at: null }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chunk: false,
          since: 0,
          events: [rawEvent],
        }),
      });
    }) as unknown as typeof fetch;
  }

  it('start_timezoneを踏まえてイベント自身のタイムゾーンでの日付をISO文字列に焼き込む', async () => {
    mockFetchWithEvent({
      uuid: 'event-allday',
      title: '終日予定',
      start_at: startAtMs,
      end_at: endAtMs,
      all_day: true,
      start_timezone: 'Asia/Tokyo',
      end_timezone: 'Asia/Tokyo',
    });

    const events = await fetchAllEvents('session-id');

    expect(events).toEqual([
      {
        id: 'event-allday',
        title: '終日予定',
        startAt: '2026-08-04T00:00:00+09:00',
        endAt: '2026-08-05T00:00:00+09:00',
        allDay: true,
      },
    ]);
    // start_timezoneを無視した素朴な変換(バグ側)だと得られてしまう値と
    // 明確に異なることを確認する(リグレッション防止)
    expect(events[0].startAt).not.toBe(new Date(startAtMs).toISOString());
    expect(events[0].endAt).not.toBe(new Date(endAtMs).toISOString());
  });

  it('変換後のScheduleEventをbuildMonthGridに渡すと、正しい日のセルに予定が紐づく(統合確認)', async () => {
    // 8/4 00:00 JST 〜 8/7 00:00 JST は、8/4・8/5・8/6 の3日間にまたがる終日予定
    // (終日予定はendAtが最終日翌日の0時になる、TimeTreeのall_dayイベントの一般的な表現)
    const tripStartMs = new Date('2026-08-04T00:00:00+09:00').getTime();
    const tripEndMs = new Date('2026-08-07T00:00:00+09:00').getTime();
    mockFetchWithEvent({
      uuid: 'trip',
      title: '旅行',
      start_at: tripStartMs,
      end_at: tripEndMs,
      all_day: true,
      start_timezone: 'Asia/Tokyo',
      end_timezone: 'Asia/Tokyo',
    });

    const events = await fetchAllEvents('session-id');
    const cells = buildMonthGrid(dayjs('2026-08-15'), events);
    const eventIdsOn = (dateStr: string) =>
      cells.find((cell) => cell.date.format('YYYY-MM-DD') === dateStr)?.events.map((e) => e.id);

    expect(eventIdsOn('2026-08-04')).toEqual(['trip']);
    expect(eventIdsOn('2026-08-05')).toEqual(['trip']);
    expect(eventIdsOn('2026-08-06')).toEqual(['trip']);
    expect(eventIdsOn('2026-08-07')).toEqual([]);
  });
});
