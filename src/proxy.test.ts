/** @jest-environment node */

import { NextRequest } from 'next/server';
import { proxy } from './proxy';

// proxy.ts自体のコメントにある通り、本番(NODE_ENV==='production')で
// BOARD_ACCESS_TOKENが未設定のとき「未設定=認証スキップ」のまま放置すると
// 個人のカレンダー情報が無警告で世界に公開されてしまう。
// この一連のフェイルクローズ判定にはテストが1件もなかったため追加する。
describe('proxy', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function buildRequest(url: string, cookie?: string): NextRequest {
    const headers = new Headers();
    if (cookie) {
      headers.set('Cookie', cookie);
    }
    return new NextRequest(new URL(url), { headers });
  }

  it('本番でBOARD_ACCESS_TOKEN未設定・バイパスフラグなしの場合は401で拒否する(フェイルクローズ)', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      BOARD_ACCESS_TOKEN: '',
      SKIP_BOARD_AUTH_FAILCLOSE: '',
    };

    const response = proxy(buildRequest('http://localhost/'));

    expect(response.status).toBe(401);
  });

  it('本番でBOARD_ACCESS_TOKEN未設定・バイパスフラグなしの場合、旧実装のプレースホルダー値を?keyに指定しても401で拒否する(すり抜け不可の回帰テスト)', () => {
    // 修正前の実装は、フェイルクローズ時に'__unset_in_production__'という
    // プレースホルダー文字列をisBoardRequestAuthorizedのexpectedTokenとして渡していた。
    // このリポジトリは公開のため、そのプレースホルダー文字列自体がソースコードから
    // 誰でも読める。つまり?key=__unset_in_production__というリクエストを送るだけで
    // queryToken === expectedTokenが成立してしまい、フェイルクローズを完全にすり抜けられた。
    // 修正後はフェイルクローズ時にisBoardRequestAuthorizedを一切呼ばず即401を返すため、
    // このプレースホルダー値を含め、どんな?keyの値を指定しても通らないことを検証する。
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      BOARD_ACCESS_TOKEN: '',
      SKIP_BOARD_AUTH_FAILCLOSE: '',
    };

    const bypassAttempts = ['__unset_in_production__', '', 'undefined', 'null'];

    for (const key of bypassAttempts) {
      const response = proxy(buildRequest(`http://localhost/?key=${encodeURIComponent(key)}`));
      expect(response.status).toBe(401);
    }
  });

  it('本番でBOARD_ACCESS_TOKEN未設定でもバイパスフラグがtrueなら通す(E2E用の抜け道)', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      BOARD_ACCESS_TOKEN: '',
      SKIP_BOARD_AUTH_FAILCLOSE: 'true',
    };

    const response = proxy(buildRequest('http://localhost/'));

    expect(response.status).toBe(200);
  });

  it('NODE_ENVがproduction以外の場合はトークン未設定でもフェイルクローズしない(開発時の挙動を妨げない)', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      BOARD_ACCESS_TOKEN: '',
      SKIP_BOARD_AUTH_FAILCLOSE: '',
    };

    const response = proxy(buildRequest('http://localhost/'));

    expect(response.status).toBe(200);
  });

  it('本番でBOARD_ACCESS_TOKENが設定済みの場合、Cookieもクエリもなければ401で拒否する(通常の認証)', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      BOARD_ACCESS_TOKEN: 'secret',
      SKIP_BOARD_AUTH_FAILCLOSE: '',
    };

    const response = proxy(buildRequest('http://localhost/'));

    expect(response.status).toBe(401);
  });

  it('本番でBOARD_ACCESS_TOKENが設定済みの場合、正しい?keyクエリならCookieを発行して通す', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      BOARD_ACCESS_TOKEN: 'secret',
      SKIP_BOARD_AUTH_FAILCLOSE: '',
    };

    const response = proxy(buildRequest('http://localhost/?key=secret'));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('board_access=secret');
  });
});
