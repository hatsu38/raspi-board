/**
 * BOARD_ACCESS_TOKEN が未設定の場合は認証をスキップする(true を返す)。
 * ローカル開発時に環境変数なしでも動作させるための意図的な挙動。
 * 本番(Vercel)では必ず設定すること。
 */
export function isBoardRequestAuthorized(
  cookieToken: string | undefined,
  queryToken: string | null,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) {
    return true;
  }
  return cookieToken === expectedToken || queryToken === expectedToken;
}
