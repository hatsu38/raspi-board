import { extractSessionId, loginToTimeTree, TimeTreeAuthError } from './auth';

describe('extractSessionId', () => {
  it('_session_idを含むCookie群からセッションIDを取り出す', () => {
    const cookies = ['other=1; Path=/', '_session_id=abc123; Path=/; HttpOnly'];

    expect(extractSessionId(cookies)).toBe('abc123');
  });

  it('_session_idが含まれない場合はnullを返す', () => {
    expect(extractSessionId(['other=1; Path=/'])).toBeNull();
  });
});

describe('loginToTimeTree', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('ログイン成功時はセッションIDを返す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { getSetCookie: () => ['_session_id=abc123; Path=/'] },
    }) as unknown as typeof fetch;

    const sessionId = await loginToTimeTree('user@example.com', 'password');

    expect(sessionId).toBe('abc123');
  });

  it('ログイン失敗時はTimeTreeAuthErrorを投げる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { getSetCookie: () => [] },
    }) as unknown as typeof fetch;

    await expect(loginToTimeTree('user@example.com', 'wrong')).rejects.toThrow(
      TimeTreeAuthError
    );
  });

  it('セッションCookieが取得できない場合もTimeTreeAuthErrorを投げる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { getSetCookie: () => [] },
    }) as unknown as typeof fetch;

    await expect(loginToTimeTree('user@example.com', 'password')).rejects.toThrow(
      TimeTreeAuthError
    );
  });
});
