import { fetchActiveCalendarIds, fetchAllEvents, TimeTreeCalendarError } from './calendar';

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
