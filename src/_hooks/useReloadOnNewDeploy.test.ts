import { renderHook } from '@testing-library/react';
import { reloadPage } from '../_libs/reloadPage';
import { useReloadOnNewDeploy } from './useReloadOnNewDeploy';

const CHECK_INTERVAL = 5 * 60 * 1000;

jest.mock('../_libs/reloadPage', () => ({
  reloadPage: jest.fn(),
}));

const reloadPageMock = jest.mocked(reloadPage);
const originalFetch = global.fetch;

// version.jsonの取得結果を、チェック1回ごとに順番に返すよう仕込む。
// null を渡した回は取得失敗(レスポンスがokでない)を表す。
function mockVersionChecks(...builtAts: (string | null)[]) {
  const fetchMock = jest.fn();

  builtAts.forEach((builtAt) => {
    if (builtAt === null) {
      fetchMock.mockResolvedValueOnce({ ok: false });
      return;
    }
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ builtAt }) });
  });

  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

// 定期チェックをcount回進める。fetchの解決も待つため非同期版のタイマー送りを使う
async function advanceChecks(count: number) {
  await jest.advanceTimersByTimeAsync(CHECK_INTERVAL * count);
}

describe('useReloadOnNewDeploy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reloadPageMock.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('起動直後のチェックでは、基準を覚えるだけでリロードしない', async () => {
    mockVersionChecks('2026-08-14T00:00:00.000Z');

    renderHook(() => useReloadOnNewDeploy());
    await advanceChecks(0);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });

  it('ビルド識別子が変わらない間はリロードしない', async () => {
    mockVersionChecks(
      '2026-08-14T00:00:00.000Z',
      '2026-08-14T00:00:00.000Z',
      '2026-08-14T00:00:00.000Z',
    );

    renderHook(() => useReloadOnNewDeploy());
    await advanceChecks(2);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });

  it('ビルド識別子が変わったらリロードする', async () => {
    mockVersionChecks('2026-08-14T00:00:00.000Z', '2026-08-14T09:30:00.000Z');

    renderHook(() => useReloadOnNewDeploy());
    await advanceChecks(1);

    expect(reloadPageMock).toHaveBeenCalledTimes(1);
  });

  it('取得に失敗した回はリロードせず、次のチェックで変化を検知する', async () => {
    mockVersionChecks('2026-08-14T00:00:00.000Z', null, '2026-08-14T09:30:00.000Z');

    renderHook(() => useReloadOnNewDeploy());
    await advanceChecks(1);
    expect(reloadPageMock).not.toHaveBeenCalled();

    await advanceChecks(1);
    expect(reloadPageMock).toHaveBeenCalledTimes(1);
  });

  it('アンマウント後はチェックしない', async () => {
    const fetchMock = mockVersionChecks('2026-08-14T00:00:00.000Z');

    const { unmount } = renderHook(() => useReloadOnNewDeploy());
    await advanceChecks(0);
    unmount();
    await advanceChecks(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
