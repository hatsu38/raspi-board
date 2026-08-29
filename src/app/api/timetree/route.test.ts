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

  it('今日より前・1ヶ月より先の予定は除外し、範囲内の予定だけを返す', async () => {
    (loginToTimeTree as jest.Mock).mockResolvedValue('session-id');
    (fetchAllEvents as jest.Mock).mockResolvedValue([
      {
        id: 'past',
        title: '過去の予定',
        startAt: '2026-07-01T09:00:00+09:00',
        endAt: '2026-07-01T10:00:00+09:00',
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
        id: 'far-future',
        title: '2ヶ月以上先の予定',
        startAt: '2026-10-29T09:00:00+09:00',
        endAt: '2026-10-29T10:00:00+09:00',
        allDay: false,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.events.map((event: { id: string }) => event.id)).toEqual(['in-range']);
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
