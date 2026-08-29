/** @jest-environment node */

jest.mock('../../../_libs/timetree/auth');
jest.mock('../../../_libs/timetree/calendar');

import { GET } from './route';
import { loginToTimeTree } from '../../../_libs/timetree/auth';
import { fetchAllEvents } from '../../../_libs/timetree/calendar';

describe('GET /api/timetree', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TIMETREE_EMAIL: 'user@example.com',
      TIMETREE_PASSWORD: 'password',
    };
    jest.clearAllMocks();
    // 表示範囲フィルタ(今日から1ヶ月)が実行時の実時刻に依存してしまわないよう固定する
    jest.useFakeTimers();
    // 00:00ちょうどに固定しているのは、上限(1ヶ月後の日末)の境界値テストで
    // 「同日の夕方の予定」を作りやすくするため
    jest.setSystemTime(new Date('2026-08-29T00:00:00+09:00'));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('ログイン・取得に成功したら予定一覧を200で返す', async () => {
    (loginToTimeTree as jest.Mock).mockResolvedValue('session-id');
    (fetchAllEvents as jest.Mock).mockResolvedValue([
      {
        id: '1',
        title: '健診',
        startAt: '2026-08-29T09:00:00+09:00',
        endAt: '2026-08-29T10:00:00+09:00',
        allDay: false,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(1);
  });

  it('当月より前・1ヶ月後の日末より先の予定は除外し、範囲内の予定だけを返す', async () => {
    (loginToTimeTree as jest.Mock).mockResolvedValue('session-id');
    (fetchAllEvents as jest.Mock).mockResolvedValue([
      {
        id: 'before-current-month',
        title: '先月の予定',
        startAt: '2026-07-31T09:00:00+09:00',
        endAt: '2026-07-31T10:00:00+09:00',
        allDay: false,
      },
      {
        id: 'earlier-this-month',
        // 現在時刻(2026-08-29)より前だが当月内の予定。
        // 下限が「今日」のままなら除外されていたが、scheduleモードの月間グリッドは
        // 当月をまるごと描画するため、下限を「当月の月初」に広げてこれを含める
        title: '今月・今日より前の予定',
        startAt: '2026-08-05T09:00:00+09:00',
        endAt: '2026-08-05T10:00:00+09:00',
        allDay: false,
      },
      {
        id: 'in-range',
        title: '範囲内の予定',
        startAt: '2026-09-10T09:00:00+09:00',
        endAt: '2026-09-10T10:00:00+09:00',
        allDay: false,
      },
      {
        id: 'upper-bound-end-of-day',
        // 上限ちょうどの日(1ヶ月後の2026-09-29)の、リクエスト時刻(00:00)より後の予定。
        // 上限が単なる「1ヶ月後の瞬間」のままなら除外されていたが、
        // endOf('day')にすることでその日一杯を含める
        title: '1ヶ月後の日の夕方の予定',
        startAt: '2026-09-29T15:00:00+09:00',
        endAt: '2026-09-29T16:00:00+09:00',
        allDay: false,
      },
      {
        id: 'far-future',
        title: '2ヶ月以上先の予定',
        startAt: '2026-10-29T09:00:00+09:00',
        endAt: '2026-10-29T10:00:00+09:00',
        allDay: false,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.events.map((event: { id: string }) => event.id)).toEqual([
      'earlier-this-month',
      'in-range',
      'upper-bound-end-of-day',
    ]);
  });

  it('月初00:00〜09:00 JSTの間でも月境界をJSTで正しく判定する(サーバーがUTCで動いても崩れないことの回帰テスト)', async () => {
    // 不具合の内容: dayjs()はサーバープロセスの環境依存タイムゾーンで「今」を
    // 解釈する。Vercel(UTC)で実行され、かつ「今」がJSTで月初00:00〜09:00
    // (UTC暦ではまだ前月末日)のとき、.tz('Asia/Tokyo')を付けていないと
    // 「今月」がUTC暦の前月のまま扱われてしまう。この1点のズレにより
    // 2つの症状が同時に起きる(このテストは以下2つの予定でそれを検証する):
    // 1. 下限(startOf('month'))が前月の月初まで戻ってしまい、本来は
    //    範囲外のはずの前月(8月)の予定が結果に残る(誤って含まれる)
    // 2. 上限(1ヶ月後の日末)がUTC暦で計算されるため、正しいJSTの上限
    //    (10/1の日末)より最大9時間早く閉じてしまい、10/1午後のような
    //    本来含まれるはずの予定が結果から落ちる(誤って除外される)
    //
    // 2026-09-01T03:00:00+09:00 は 2026-08-31T18:00:00Z。UTC暦では
    // まだ8/31なので、タイムゾーンを固定していないサーバーは
    // 「今月」を8月だと誤認する。
    jest.setSystemTime(new Date('2026-09-01T03:00:00+09:00'));

    (loginToTimeTree as jest.Mock).mockResolvedValue('session-id');
    (fetchAllEvents as jest.Mock).mockResolvedValue([
      {
        id: 'stale-last-month',
        // JSTでは明確に先月(8月)の予定。下限がUTC暦で8/1まで戻ってしまう
        // 不具合があると、本来除外されるべきこの予定が誤って含まれてしまう
        title: '先月(8月)の予定',
        startAt: '2026-08-15T09:00:00+09:00',
        endAt: '2026-08-15T10:00:00+09:00',
        allDay: false,
      },
      {
        id: 'early-morning-this-month',
        // 「今」(9/1 03:00 JST)より後、9/1 09:00 JSTより前の予定。
        // 下限がUTC暦で判定されても9/1 09:00 JSTより前の瞬間はUTC暦でも
        // 8/31 のうちに収まるため、この予定自体は不具合の有無に関わらず
        // 含まれる(下限側だけを見た誤った回帰テストにしないための対照)
        title: '9/1早朝の予定',
        startAt: '2026-09-01T06:00:00+09:00',
        endAt: '2026-09-01T07:00:00+09:00',
        allDay: false,
      },
      {
        id: 'next-month-last-day-afternoon',
        // 上限(1ヶ月後の日末)は正しくは10/1の日末(JST)まで含むはずだが、
        // UTC暦で計算すると9/30の日末(UTC)までしか含まれない。
        // この予定(10/1午後、JST)はその間に落ちるため、上限のズレがあると
        // 誤って除外されてしまう
        title: '10/1午後の予定',
        startAt: '2026-10-01T12:00:00+09:00',
        endAt: '2026-10-01T13:00:00+09:00',
        allDay: false,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.events.map((event: { id: string }) => event.id)).toEqual([
      'early-morning-this-month',
      'next-month-last-day-afternoon',
    ]);
  });

  it('環境変数が未設定の場合は500を返す', async () => {
    process.env = { ...originalEnv, TIMETREE_EMAIL: '', TIMETREE_PASSWORD: '' };

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it('ログイン失敗時は502を返す', async () => {
    (loginToTimeTree as jest.Mock).mockRejectedValue(new Error('ログイン失敗'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe('ログイン失敗');
  });
});
