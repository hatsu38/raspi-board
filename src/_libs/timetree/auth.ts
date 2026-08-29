/*
 * TimeTree公式APIは2023年12月に終了しており、ここでは非公式のWeb APIを
 * 直接叩く(参考: https://github.com/eoleedi/TimeTree-Exporter)。
 * TimeTree側の仕様変更で予告なく壊れる可能性がある。
 */

const AUTH_URL = 'https://timetreeapp.com/api/v1/auth/email/signin';
const API_USER_AGENT = 'web/2.1.0/en';

export class TimeTreeAuthError extends Error {}

export function extractSessionId(setCookieHeaders: string[]): string | null {
  for (const cookie of setCookieHeaders) {
    const match = cookie.match(/^_session_id=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export async function loginToTimeTree(email: string, password: string): Promise<string> {
  const response = await fetch(AUTH_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Timetreea': API_USER_AGENT,
    },
    body: JSON.stringify({
      uid: email,
      password,
      uuid: crypto.randomUUID().replace(/-/g, ''),
    }),
  });

  if (!response.ok) {
    throw new TimeTreeAuthError(
      `TimeTreeへのログインに失敗しました (status: ${response.status})`
    );
  }

  const sessionId = extractSessionId(response.headers.getSetCookie());
  if (!sessionId) {
    throw new TimeTreeAuthError('セッションCookieを取得できませんでした');
  }
  return sessionId;
}
