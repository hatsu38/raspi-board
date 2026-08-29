import { loginToTimeTree } from '../../../_libs/timetree/auth';
import { fetchAllEvents } from '../../../_libs/timetree/calendar';
import dayjs from '../../../_libs/dayjsJa';
import type { ScheduleEvent } from '../../../types/schedule';

const DISPLAY_RANGE_MONTHS = 1;

// TimeTreeのevents/syncは差分同期用のsinceカーソルしか持たず、日付範囲を
// 指定して取得することはできない(fetchAllEventsは常に全履歴を返す)。
// そのため、取得後にアプリ側で「今日から1ヶ月分」(設計書の表示範囲)へ絞り込む。
// これによりブラウザへ送るJSONのサイズを抑えられる(TimeTree自体からの取得が
// 全履歴になる点は仕様上の制約であり、ここでは解決できない)。
function filterEventsWithinDisplayRange(events: ScheduleEvent[]): ScheduleEvent[] {
  const startOfToday = dayjs().startOf('day');
  const rangeEnd = dayjs().add(DISPLAY_RANGE_MONTHS, 'month');
  return events.filter(
    (event) =>
      dayjs(event.endAt).isSameOrAfter(startOfToday) && dayjs(event.startAt).isSameOrBefore(rangeEnd)
  );
}

export async function GET() {
  const email = process.env.TIMETREE_EMAIL;
  const password = process.env.TIMETREE_PASSWORD;

  if (!email || !password) {
    return Response.json(
      { error: 'TIMETREE_EMAIL/TIMETREE_PASSWORDが設定されていません' },
      { status: 500 }
    );
  }

  try {
    const sessionId = await loginToTimeTree(email, password);
    const events = await fetchAllEvents(sessionId);
    return Response.json({ events: filterEventsWithinDisplayRange(events) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
    return Response.json({ error: message }, { status: 502 });
  }
}
