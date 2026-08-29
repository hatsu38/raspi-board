import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isBoardRequestAuthorized } from './_libs/boardAuth';

const COOKIE_NAME = 'board_access';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1年

export function proxy(request: NextRequest) {
  const expectedToken = process.env.BOARD_ACCESS_TOKEN;
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const queryToken = request.nextUrl.searchParams.get('key');

  if (!isBoardRequestAuthorized(cookieToken, queryToken, expectedToken)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const response = NextResponse.next();

  // クエリのトークンで新規に認証できた場合だけ Cookie を発行し直す
  if (expectedToken && queryToken === expectedToken && cookieToken !== expectedToken) {
    response.cookies.set(COOKIE_NAME, expectedToken, {
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
