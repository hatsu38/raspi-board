import { loginToTimeTree } from '../../../_libs/timetree/auth';
import { fetchAllEvents } from '../../../_libs/timetree/calendar';
import dayjs from '../../../_libs/dayjsJa';
import type { ScheduleEvent } from '../../../types/schedule';

const DISPLAY_RANGE_MONTHS = 1;

// TimeTreeのevents/syncは差分同期用のsinceカーソルしか持たず、日付範囲を
// 指定して取得することはできない(fetchAllEventsは常に全履歴を返す)。
// そのため、取得後にアプリ側で表示に必要な範囲へ絞り込む。
// これによりブラウザへ送るJSONのサイズを抑えられる(TimeTree自体からの取得が
// 全履歴になる点は仕様上の制約であり、ここでは解決できない)。
//
// 下限は「今日」ではなく「当月の月初」にする。scheduleモードの月間グリッド
// (buildMonthGrid)は当月をまるごと(前後の週の余白日を含めて)描画するため、
// 下限を「今日」にすると今日より前の当月内の日(例: 8/29に見た場合の8/1〜8/28)が
// 予定の有無に関わらず常に空欄になってしまう。取得件数が多少増える(最大でも
// 1ヶ月分程度)のと引き換えに、月間グリッドが常に正しく描画されることを優先する。
//
// 上限はendOf('day')で当日の終わりまでを含める。単なる「1ヶ月後の同時刻」
// (バレな瞬間)のままだと、リクエストが日中に実行された場合に「1ヶ月後の
// その日の、リクエスト時刻より後」の予定が範囲外として落ちてしまうため。
function filterEventsWithinDisplayRange(events: ScheduleEvent[]): ScheduleEvent[] {
  const rangeStart = dayjs().startOf('month');
  const rangeEnd = dayjs().add(DISPLAY_RANGE_MONTHS, 'month').endOf('day');
  return events.filter(
    (event) =>
      dayjs(event.endAt).isSameOrAfter(rangeStart) && dayjs(event.startAt).isSameOrBefore(rangeEnd)
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
