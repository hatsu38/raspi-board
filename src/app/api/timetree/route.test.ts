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
  });

  afterEach(() => {
    process.env = originalEnv;
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
