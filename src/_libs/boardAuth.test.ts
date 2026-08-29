import { isBoardRequestAuthorized } from './boardAuth';

describe('isBoardRequestAuthorized', () => {
  it('BOARD_ACCESS_TOKENが未設定の場合は常に許可する(開発環境での動作を妨げないため)', () => {
    expect(isBoardRequestAuthorized(undefined, null, undefined)).toBe(true);
  });

  it('Cookieのトークンが一致すれば許可する', () => {
    expect(isBoardRequestAuthorized('secret', null, 'secret')).toBe(true);
  });

  it('クエリパラメータのトークンが一致すれば許可する', () => {
    expect(isBoardRequestAuthorized(undefined, 'secret', 'secret')).toBe(true);
  });

  it('CookieもクエリパラメータもなければBOARD_ACCESS_TOKEN設定時は拒否する', () => {
    expect(isBoardRequestAuthorized(undefined, null, 'secret')).toBe(false);
  });

  it('トークンが一致しなければ拒否する', () => {
    expect(isBoardRequestAuthorized('wrong', 'wrong-too', 'secret')).toBe(false);
  });
});
