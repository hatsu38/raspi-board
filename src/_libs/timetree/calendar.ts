import dayjs from '../dayjsJa';
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
  start_timezone: string;
  end_timezone: string;
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

// TimeTreeの終日(all_day)予定は、「この予定はカレンダー上のD日を表す」という
// 情報を「イベント自身のタイムゾーンで解釈した壁時計時刻」としてエポックミリ秒に
// エンコードしている(参考: このクライアントの実装元であるtimetree-exporterの
// datetime.fromtimestamp(time / 1000, ZoneInfo(timezone)))。
// 例えばJSTの終日予定「8/4」は、UTC換算で「8/3 15:00」というエポックになる。
//
// これをnew Date(epoch).toISOString()で単純にUTC文字列化すると、絶対時刻としては
// 正しいままだが、文字列に現れる日付は「8/3」になる。dayjsのようにタイムゾーンを
// 正しく踏まえてパース・整形するコード(buildMonthGrid・pickUpcomingEventsなど)を
// 介せば元の「8/4」は復元できるが、日付部分を直接読む(文字列の先頭10文字を
// 切り出すなど)コードや、ボードの実行環境がJST以外だった場合には復元できない。
// そこで終日予定に限り、イベント自身のタイムゾーンでの壁時計時刻を
// そのタイムゾーンのオフセット付きISO文字列(例: "2026-08-04T00:00:00+09:00")として
// 焼き込み、文字列自体が正しいカレンダー日付を表すようにする。
//
// 時刻指定の予定はUTCの絶対時刻がそのまま曖昧さなく成立する(タイムゾーンを
// 通した「日付」の解釈が不要)ため、この変換は不要。
function toZonedIsoString(epochMs: number, timeZone: string): string {
  return dayjs.tz(epochMs, timeZone).format('YYYY-MM-DDTHH:mm:ssZ');
}

function toScheduleEvent(raw: TimeTreeEventRaw): ScheduleEvent {
  if (raw.all_day) {
    return {
      id: raw.uuid,
      title: raw.title ?? '',
      startAt: toZonedIsoString(raw.start_at, raw.start_timezone),
      endAt: toZonedIsoString(raw.end_at, raw.end_timezone),
      allDay: raw.all_day,
    };
  }
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
