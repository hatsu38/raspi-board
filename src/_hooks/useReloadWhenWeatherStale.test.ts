import { renderHook } from '@testing-library/react';
import { reloadPage } from '../_libs/reloadPage';
import { fetchBuiltAt } from '../_libs/fetchBuiltAt';
import { useReloadWhenWeatherStale } from './useReloadWhenWeatherStale';

const MINUTE = 60 * 1000;

jest.mock('../_libs/reloadPage', () => ({
  reloadPage: jest.fn(),
}));

jest.mock('../_libs/fetchBuiltAt', () => ({
  fetchBuiltAt: jest.fn(),
}));

const reloadPageMock = jest.mocked(reloadPage);
const fetchBuiltAtMock = jest.mocked(fetchBuiltAt);

// fetchBuiltAtの解決も待つため非同期版のタイマー送りを使う
async function advanceMinutes(minutes: number) {
  await jest.advanceTimersByTimeAsync(minutes * MINUTE);
}

describe('useReloadWhenWeatherStale', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reloadPageMock.mockClear();
    // 既定ではアプリのサーバーに届く状態にしておく
    fetchBuiltAtMock.mockReset().mockResolvedValue('2026-10-04T00:00:00.000Z');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('最後に取得できてから30分経つまではリロードしない', async () => {
    renderHook(() => useReloadWhenWeatherStale(Date.now()));
    await advanceMinutes(29);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });

  it('最後に取得できてから30分経ったらリロードする', async () => {
    renderHook(() => useReloadWhenWeatherStale(Date.now()));
    await advanceMinutes(30);

    expect(reloadPageMock).toHaveBeenCalledTimes(1);
  });

  it('途中で取得できたら、その時刻から数え直す', async () => {
    const { rerender } = renderHook(
      ({ lastUpdatedAt }) => useReloadWhenWeatherStale(lastUpdatedAt),
      { initialProps: { lastUpdatedAt: Date.now() } },
    );
    await advanceMinutes(20);
    rerender({ lastUpdatedAt: Date.now() });
    await advanceMinutes(20);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });

  it('一度も取得できないまま30分経ったらリロードする', async () => {
    renderHook(() => useReloadWhenWeatherStale(null));
    await advanceMinutes(30);

    expect(reloadPageMock).toHaveBeenCalledTimes(1);
  });

  it('アプリのサーバーに届かないときはリロードしない', async () => {
    fetchBuiltAtMock.mockResolvedValue(null);

    renderHook(() => useReloadWhenWeatherStale(Date.now()));
    await advanceMinutes(60);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });

  it('アンマウント後はリロードしない', async () => {
    const { unmount } = renderHook(() => useReloadWhenWeatherStale(Date.now()));
    unmount();
    await advanceMinutes(60);

    expect(reloadPageMock).not.toHaveBeenCalled();
  });
});
