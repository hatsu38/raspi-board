import type { ScheduleEvent } from '../../types/schedule';

const API_BASE_URL = 'https://timetreeapp.com/api/v1';
const API_USER_AGENT = 'web/2.1.0/en';

export class TimeTreeCalendarError extends Error {}

type TimeTreeCalendarMetadata = {
  id: string;
  deactivated_at: string | null;
};

type TimeTreeEventRaw = {
  uuid: string;
  title: string | null;
  start_at: number;
  end_at: number;
  all_day: boolean;
};

type TimeTreeEventsSyncResponse = {
  events: TimeTreeEventRaw[];
  chunk: boolean;
  since: number;
};

function buildHeaders(sessionId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Timetreea': API_USER_AGENT,
    Cookie: `_session_id=${sessionId}`,
  };
}

export async function fetchActiveCalendarIds(sessionId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/calendars?since=0`, {
    headers: buildHeaders(sessionId),
  });
  if (!response.ok) {
    throw new TimeTreeCalendarError(
      `カレンダー一覧の取得に失敗しました (status: ${response.status})`
    );
  }
  const data: { calendars: TimeTreeCalendarMetadata[] } = await response.json();
  return data.calendars
    .filter((calendar) => calendar.deactivated_at === null)
    .map((calendar) => calendar.id);
}

async function fetchEventsRecur(
  calendarId: string,
  sessionId: string,
  since: number
): Promise<TimeTreeEventRaw[]> {
  const response = await fetch(
    `${API_BASE_URL}/calendar/${calendarId}/events/sync?since=${since}`,
    { headers: buildHeaders(sessionId) }
  );
  if (!response.ok) {
    throw new TimeTreeCalendarError(`予定の取得に失敗しました (status: ${response.status})`);
  }
  const data: TimeTreeEventsSyncResponse = await response.json();
  if (data.chunk) {
    const rest = await fetchEventsRecur(calendarId, sessionId, data.since);
    return [...data.events, ...rest];
  }
  return data.events;
}

function toScheduleEvent(raw: TimeTreeEventRaw): ScheduleEvent {
  return {
    id: raw.uuid,
    title: raw.title ?? '',
    startAt: new Date(raw.start_at).toISOString(),
    endAt: new Date(raw.end_at).toISOString(),
    allDay: raw.all_day,
  };
}

export async function fetchAllEvents(sessionId: string): Promise<ScheduleEvent[]> {
  const calendarIds = await fetchActiveCalendarIds(sessionId);
  const eventLists = await Promise.all(
    calendarIds.map((calendarId) => fetchEventsRecur(calendarId, sessionId, 0))
  );
  return eventLists.flat().map(toScheduleEvent);
}
