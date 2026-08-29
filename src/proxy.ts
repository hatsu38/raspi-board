import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isBoardRequestAuthorized } from './_libs/boardAuth';

const COOKIE_NAME = 'board_access';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1年

// isBoardRequestAuthorized(boardAuth.ts)はBOARD_ACCESS_TOKEN未設定時、
// ローカル開発の利便性のため認証をスキップ(true)する純粋関数として書かれている。
// しかし本番(Vercel)でこれが起きると、環境変数の設定漏れ・ミスだけで
// 個人のカレンダー情報が無警告で世界に公開されてしまう。
// そのため本番では「未設定」を「拒否」側にフェイルクローズする。
// 判定はここ(proxy.ts)だけで行い、boardAuth.ts自体には手を入れない
// (既存の5件のテストはexpectedTokenを直接渡す純粋関数としての契約を検証しているため)。
//
// フェイルクローズを有効化する条件はNODE_ENV==='production'だが、
// playwright.config.tsのE2Eは「next build && next startを本番相当のまま動かしつつ
// BOARD_ACCESS_TOKENを空にする」必要があり、NODE_ENV自体を変えると
// Next.js本番サーバーの他の挙動(最適化やビルド時のNODE_ENV参照箇所)に
// 副作用が及ぶ可能性がある。そこで、この判定だけを専用フラグ
// SKIP_BOARD_AUTH_FAILCLOSE で無効化できるようにし、E2E用の環境ではそちらを使う。
const FAIL_CLOSED_PLACEHOLDER_TOKEN = '__unset_in_production__';

export function proxy(request: NextRequest) {
  const rawExpectedToken = process.env.BOARD_ACCESS_TOKEN;
  // isBoardRequestAuthorizedは空文字列も「未設定」として扱う(!expectedToken)ため、
  // ここでも同じ基準(!rawExpectedToken)で「未設定」を判定する
  const isTokenUnset = !rawExpectedToken;
  const shouldFailClosed =
    process.env.NODE_ENV === 'production' && process.env.SKIP_BOARD_AUTH_FAILCLOSE !== 'true';
  const effectiveExpectedToken =
    isTokenUnset && shouldFailClosed ? FAIL_CLOSED_PLACEHOLDER_TOKEN : rawExpectedToken;

  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const queryToken = request.nextUrl.searchParams.get('key');

  if (!isBoardRequestAuthorized(cookieToken, queryToken, effectiveExpectedToken)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const response = NextResponse.next();

  // クエリのトークンで新規に認証できた場合だけ Cookie を発行し直す
  // (プレースホルダーではなく実際に設定されたトークンと比較する)
  if (rawExpectedToken && queryToken === rawExpectedToken && cookieToken !== rawExpectedToken) {
    response.cookies.set(COOKIE_NAME, rawExpectedToken, {
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // 静的アセット以外の全パス(ページ・/api/timetree を含む)に適用する
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
