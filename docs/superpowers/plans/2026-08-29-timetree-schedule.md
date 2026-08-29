# TimeTree予定表示機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TimeTreeの予定を、Raspberry Piの情報ボードのdefaultモード(直近5件)と新規専用モード`schedule`(月間カレンダー)に表示し、ボード全体をURLトークンで保護する。

**Architecture:** Next.js API Route(`src/app/api/timetree/route.ts`)がサーバーサイドでTimeTree非公式Web APIにログインして予定を取得し、既存の`WeatherContext`と同じパターンの`ScheduleContext`がそれを5分ごとにポーリングする。UIは純粋関数(`pickUpcomingEvents` / `buildMonthGrid`)で予定データを表示用に整形する。ボード全体の保護はNext.js 16の`proxy.ts`(旧middleware)で行う。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript / dayjs / Jest + React Testing Library

## Global Constraints

- パッケージマネージャは pnpm。`pnpm run test` でユニットテストを実行する。
- import は相対パスで統一する(`@/*` エイリアスは使わない、既存コードに合わせる)。
- dayjs は必ず `src/_libs/dayjsJa.ts` 経由で import する(ja ロケール・プラグイン登録済みのため)。
- 環境変数はサーバー側専用(`TIMETREE_EMAIL` / `TIMETREE_PASSWORD` / `BOARD_ACCESS_TOKEN`)。`next.config.ts` の `env` には**絶対に追加しない**(クライアントバンドルに露出するため)。
- Next.js 16 では `middleware.ts` は非推奨。**`src/proxy.ts` に `export function proxy(request: NextRequest)` を書く**(`middleware`という名前の関数ではない)。
- コンポーネントはすべて `'use client'`。サーバーコンポーネントは使わない(API Route Handlerのみサーバー実行)。
- 文字サイズは `globals.css` の `vh` 基準クラス(`.fs-*`)を使う。Tailwindの `text-*` は使わない。
- 「1mから一瞬で読む」情報を追加するときは、そのクラスを `globals.test.ts` の `DISTANCE_READABLE` にも追加する(自動でテストされる)。
- コミットメッセージは日本語。機能単位で細かく分ける。

---

### Task 1: 認証トークン検証ロジック(純粋関数)

**Files:**
- Create: `src/_libs/boardAuth.ts`
- Test: `src/_libs/boardAuth.test.ts`

**Interfaces:**
- Produces: `isBoardRequestAuthorized(cookieToken: string | undefined, queryToken: string | null, expectedToken: string | undefined): boolean` — Task 2 の `proxy.ts` から呼ばれる。

- [ ] **Step 1: Write the failing test**

`src/_libs/boardAuth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_libs/boardAuth.test.ts`
Expected: FAIL with "Cannot find module './boardAuth'"

- [ ] **Step 3: Write minimal implementation**

`src/_libs/boardAuth.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_libs/boardAuth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_libs/boardAuth.ts src/_libs/boardAuth.test.ts
git commit -m "feat: ボードアクセストークンの検証ロジックを追加"
```

---

### Task 2: 認証Proxy

**Files:**
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: `isBoardRequestAuthorized` from `src/_libs/boardAuth.ts` (Task 1)
- Produces: Next.js の `proxy` エントリーポイント。以降のタスクでは参照されない(独立した最終防衛層)。

- [ ] **Step 1: Write the implementation**

`src/proxy.ts`:

```ts
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
```

このファイルはNext.jsのフレームワーク規約に基づく統合的な挙動(実際のHTTPリクエストに対するリダイレクト/Cookie設定)なので、ユニットテストは書かない。トークン判定ロジック自体はTask 1でテスト済み。動作確認は Task 14 の後、`?key=` パラメータの有無でアクセスして目視確認する。

- [ ] **Step 2: Verify the dev server still starts**

Run: `pnpm run dev`
Expected: 起動ログにエラーが出ないこと。`BOARD_ACCESS_TOKEN` を設定していない開発環境では、`http://localhost:3000` に通常通りアクセスできる(Task 1の「未設定なら許可」の挙動)。

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: BOARD_ACCESS_TOKENによるボード全体の簡易認証を追加"
```

---

### Task 3: TimeTree予定の型定義とログイン処理

**Files:**
- Create: `src/types/schedule.ts`
- Create: `src/_libs/timetree/auth.ts`
- Test: `src/_libs/timetree/auth.test.ts`

**Interfaces:**
- Produces: `type ScheduleEvent = { id: string; title: string; startAt: string; endAt: string; allDay: boolean }` — Task 4, 5, 6, 7, 9 で使う。
- Produces: `loginToTimeTree(email: string, password: string): Promise<string>` (返り値はセッションID) — Task 4, 7 で使う。
- Produces: `class TimeTreeAuthError extends Error` — Task 7 でエラー判定に使う。
- Produces: `extractSessionId(setCookieHeaders: string[]): string | null` — 内部ロジックだがテストで直接検証する。

- [ ] **Step 1: Write the failing test**

`src/types/schedule.ts`:

```ts
export type ScheduleEvent = {
  id: string;
  title: string;
  startAt: string; // ISO8601
  endAt: string; // ISO8601
  allDay: boolean;
};
```

`src/_libs/timetree/auth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_libs/timetree/auth.test.ts`
Expected: FAIL with "Cannot find module './auth'"

- [ ] **Step 3: Write minimal implementation**

`src/_libs/timetree/auth.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_libs/timetree/auth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/types/schedule.ts src/_libs/timetree/auth.ts src/_libs/timetree/auth.test.ts
git commit -m "feat: TimeTree非公式APIへのログイン処理を追加"
```

---

### Task 4: TimeTreeカレンダー・イベント取得処理

**Files:**
- Create: `src/_libs/timetree/calendar.ts`
- Test: `src/_libs/timetree/calendar.test.ts`

**Interfaces:**
- Consumes: `ScheduleEvent` type from `src/types/schedule.ts` (Task 3)
- Produces: `fetchAllEvents(sessionId: string): Promise<ScheduleEvent[]>` — Task 7 の API Route から使う。
- Produces: `class TimeTreeCalendarError extends Error`

- [ ] **Step 1: Write the failing test**

`src/_libs/timetree/calendar.test.ts`:

```ts
import { fetchActiveCalendarIds, fetchAllEvents, TimeTreeCalendarError } from './calendar';

describe('fetchActiveCalendarIds', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('無効化されていないカレンダーのIDだけを返す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: [
          { id: 'cal-1', deactivated_at: null },
          { id: 'cal-2', deactivated_at: '2025-01-01T00:00:00Z' },
        ],
      }),
    }) as unknown as typeof fetch;

    const ids = await fetchActiveCalendarIds('session-id');

    expect(ids).toEqual(['cal-1']);
  });

  it('取得に失敗した場合はTimeTreeCalendarErrorを投げる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    await expect(fetchActiveCalendarIds('session-id')).rejects.toThrow(TimeTreeCalendarError);
  });
});

describe('fetchAllEvents', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('カレンダー一覧と予定を取得してScheduleEvent形式に整形する', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/calendars')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ calendars: [{ id: 'cal-1', deactivated_at: null }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chunk: false,
          since: 0,
          events: [
            {
              uuid: 'event-1',
              title: '健診',
              start_at: 1735689600000,
              end_at: 1735693200000,
              all_day: false,
            },
          ],
        }),
      });
    }) as unknown as typeof fetch;

    const events = await fetchAllEvents('session-id');

    expect(events).toEqual([
      {
        id: 'event-1',
        title: '健診',
        startAt: new Date(1735689600000).toISOString(),
        endAt: new Date(1735693200000).toISOString(),
        allDay: false,
      },
    ]);
  });

  it('chunkがtrueの場合は再帰的に全件取得する', async () => {
    let eventsCallCount = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/calendars')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ calendars: [{ id: 'cal-1', deactivated_at: null }] }),
        });
      }
      eventsCallCount += 1;
      if (eventsCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            chunk: true,
            since: 100,
            events: [
              {
                uuid: 'event-1',
                title: '予定1',
                start_at: 1735689600000,
                end_at: 1735693200000,
                all_day: false,
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chunk: false,
          since: 100,
          events: [
            {
              uuid: 'event-2',
              title: '予定2',
              start_at: 1735776000000,
              end_at: 1735779600000,
              all_day: false,
            },
          ],
        }),
      });
    }) as unknown as typeof fetch;

    const events = await fetchAllEvents('session-id');

    expect(events.map((e) => e.id)).toEqual(['event-1', 'event-2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_libs/timetree/calendar.test.ts`
Expected: FAIL with "Cannot find module './calendar'"

- [ ] **Step 3: Write minimal implementation**

`src/_libs/timetree/calendar.ts`:

```ts
import type { ScheduleEvent } from '../../types/schedule';

const API_BASE_URL = 'https://timetreeapp.com/api/v1';
const API_USER_AGENT = 'web/2.1.0/en';

export class TimeTreeCalendarError extends Error {}

type TimeTreeCalendarMetadata = {
  id: string;
  deactivated_at: string | null;
};

type TimeTreeEventRaw = {
  uuid: string;
  title: string | null;
  start_at: number;
  end_at: number;
  all_day: boolean;
};

type TimeTreeEventsSyncResponse = {
  events: TimeTreeEventRaw[];
  chunk: boolean;
  since: number;
};

function buildHeaders(sessionId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Timetreea': API_USER_AGENT,
    Cookie: `_session_id=${sessionId}`,
  };
}

export async function fetchActiveCalendarIds(sessionId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/calendars?since=0`, {
    headers: buildHeaders(sessionId),
  });
  if (!response.ok) {
    throw new TimeTreeCalendarError(
      `カレンダー一覧の取得に失敗しました (status: ${response.status})`
    );
  }
  const data: { calendars: TimeTreeCalendarMetadata[] } = await response.json();
  return data.calendars
    .filter((calendar) => calendar.deactivated_at === null)
    .map((calendar) => calendar.id);
}

async function fetchEventsRecur(
  calendarId: string,
  sessionId: string,
  since: number
): Promise<TimeTreeEventRaw[]> {
  const response = await fetch(
    `${API_BASE_URL}/calendar/${calendarId}/events/sync?since=${since}`,
    { headers: buildHeaders(sessionId) }
  );
  if (!response.ok) {
    throw new TimeTreeCalendarError(`予定の取得に失敗しました (status: ${response.status})`);
  }
  const data: TimeTreeEventsSyncResponse = await response.json();
  if (data.chunk) {
    const rest = await fetchEventsRecur(calendarId, sessionId, data.since);
    return [...data.events, ...rest];
  }
  return data.events;
}

function toScheduleEvent(raw: TimeTreeEventRaw): ScheduleEvent {
  return {
    id: raw.uuid,
    title: raw.title ?? '',
    startAt: new Date(raw.start_at).toISOString(),
    endAt: new Date(raw.end_at).toISOString(),
    allDay: raw.all_day,
  };
}

export async function fetchAllEvents(sessionId: string): Promise<ScheduleEvent[]> {
  const calendarIds = await fetchActiveCalendarIds(sessionId);
  const eventLists = await Promise.all(
    calendarIds.map((calendarId) => fetchEventsRecur(calendarId, sessionId, 0))
  );
  return eventLists.flat().map(toScheduleEvent);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_libs/timetree/calendar.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_libs/timetree/calendar.ts src/_libs/timetree/calendar.test.ts
git commit -m "feat: TimeTreeのカレンダー・予定取得処理を追加"
```

---

### Task 5: 直近予定の整形ロジック

**Files:**
- Create: `src/_utils/upcomingSchedule.ts`
- Test: `src/_utils/upcomingSchedule.test.ts`

**Interfaces:**
- Consumes: `ScheduleEvent` type from `src/types/schedule.ts` (Task 3)
- Produces: `type UpcomingItem = { id: string; title: string; dateLabel: string; timeLabel: string | null }`
- Produces: `pickUpcomingEvents(events: ScheduleEvent[], now: Dayjs, count: number): UpcomingItem[]` — Task 10 の `UpcomingSchedule.tsx` から使う。

- [ ] **Step 1: Write the failing test**

`src/_utils/upcomingSchedule.test.ts`:

```ts
import dayjs from '../_libs/dayjsJa';
import { pickUpcomingEvents } from './upcomingSchedule';
import type { ScheduleEvent } from '../types/schedule';

describe('pickUpcomingEvents', () => {
  const now = dayjs('2026-08-28T10:00:00+09:00');

  it('終了済みの予定は除外する', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '昨日の予定',
        startAt: '2026-08-27T09:00:00+09:00',
        endAt: '2026-08-27T10:00:00+09:00',
        allDay: false,
      },
      {
        id: '2',
        title: '今日の予定',
        startAt: '2026-08-28T15:00:00+09:00',
        endAt: '2026-08-28T16:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result.map((item) => item.id)).toEqual(['2']);
  });

  it('開始時刻が早い順に並べる', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '遅い予定',
        startAt: '2026-08-30T18:00:00+09:00',
        endAt: '2026-08-30T19:00:00+09:00',
        allDay: false,
      },
      {
        id: '2',
        title: '早い予定',
        startAt: '2026-08-29T09:00:00+09:00',
        endAt: '2026-08-29T10:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result.map((item) => item.id)).toEqual(['2', '1']);
  });

  it('countで指定した件数に絞る', () => {
    const events: ScheduleEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      title: `予定${i}`,
      startAt: now.add(i, 'day').toISOString(),
      endAt: now.add(i, 'day').add(1, 'hour').toISOString(),
      allDay: false,
    }));

    const result = pickUpcomingEvents(events, now, 5);

    expect(result).toHaveLength(5);
  });

  it('終日予定はtimeLabelがnullになる', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '実家帰省',
        startAt: '2026-08-29T00:00:00+09:00',
        endAt: '2026-08-30T00:00:00+09:00',
        allDay: true,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result[0].timeLabel).toBeNull();
  });

  it('時間指定の予定はH:mm形式のtimeLabelとdateLabelを持つ', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '健診',
        startAt: '2026-08-29T09:05:00+09:00',
        endAt: '2026-08-29T10:00:00+09:00',
        allDay: false,
      },
    ];

    const result = pickUpcomingEvents(events, now, 5);

    expect(result[0].timeLabel).toBe('9:05');
    expect(result[0].dateLabel).toBe('8/29(土)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_utils/upcomingSchedule.test.ts`
Expected: FAIL with "Cannot find module './upcomingSchedule'"

- [ ] **Step 3: Write minimal implementation**

`src/_utils/upcomingSchedule.ts`:

```ts
import type { Dayjs } from 'dayjs';
import dayjs from '../_libs/dayjsJa';
import type { ScheduleEvent } from '../types/schedule';

export type UpcomingItem = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string | null;
};

export function pickUpcomingEvents(
  events: ScheduleEvent[],
  now: Dayjs,
  count: number
): UpcomingItem[] {
  const startOfToday = now.startOf('day');

  return events
    .filter((event) => dayjs(event.endAt).isSameOrAfter(startOfToday))
    .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf())
    .slice(0, count)
    .map((event) => {
      const start = dayjs(event.startAt);
      return {
        id: event.id,
        title: event.title,
        dateLabel: `${start.format('M/D')}(${start.format('ddd')})`,
        timeLabel: event.allDay ? null : start.format('H:mm'),
      };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_utils/upcomingSchedule.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/upcomingSchedule.ts src/_utils/upcomingSchedule.test.ts
git commit -m "feat: 直近の予定を抽出・整形するロジックを追加"
```

---

### Task 6: 月間グリッド生成ロジック

**Files:**
- Create: `src/_utils/monthGrid.ts`
- Test: `src/_utils/monthGrid.test.ts`

**Interfaces:**
- Consumes: `ScheduleEvent` type from `src/types/schedule.ts` (Task 3)
- Produces: `type MonthGridCell = { date: Dayjs; isCurrentMonth: boolean; isToday: boolean; events: ScheduleEvent[] }`
- Produces: `buildMonthGrid(baseDate: Dayjs, events: ScheduleEvent[], today?: Dayjs): MonthGridCell[]` — Task 12 の `Schedule.tsx` から使う。

- [ ] **Step 1: Write the failing test**

`src/_utils/monthGrid.test.ts`:

```ts
import dayjs from '../_libs/dayjsJa';
import { buildMonthGrid } from './monthGrid';
import type { ScheduleEvent } from '../types/schedule';

describe('buildMonthGrid', () => {
  it('月曜始まりの週単位で、月の最初と最後を含むグリッドを作る', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), []);

    expect(cells[0].date.format('ddd')).toBe('月');
    expect(cells[cells.length - 1].date.format('ddd')).toBe('日');
    expect(cells.length % 7).toBe(0);
  });

  it('対象月以外の日付はisCurrentMonthがfalseになる', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), []);

    const julyCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-07-31');
    expect(julyCell?.isCurrentMonth).toBe(false);

    const augustCell = cells.find((cell) => cell.date.date() === 15 && cell.date.month() === 7);
    expect(augustCell?.isCurrentMonth).toBe(true);
  });

  it('todayに指定した日付のセルだけisTodayがtrueになる', () => {
    const cells = buildMonthGrid(dayjs('2026-08-15'), [], dayjs('2026-08-04'));

    const targetCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-04');
    expect(targetCell?.isToday).toBe(true);

    const otherCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-05');
    expect(otherCell?.isToday).toBe(false);
  });

  it('該当日の予定だけをそのセルに紐づける', () => {
    const events: ScheduleEvent[] = [
      {
        id: '1',
        title: '健診',
        startAt: '2026-08-04T09:00:00+09:00',
        endAt: '2026-08-04T10:00:00+09:00',
        allDay: false,
      },
    ];

    const cells = buildMonthGrid(dayjs('2026-08-15'), events);

    const targetCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-04');
    expect(targetCell?.events.map((e) => e.id)).toEqual(['1']);

    const otherCell = cells.find((cell) => cell.date.format('YYYY-MM-DD') === '2026-08-05');
    expect(otherCell?.events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_utils/monthGrid.test.ts`
Expected: FAIL with "Cannot find module './monthGrid'"

- [ ] **Step 3: Write minimal implementation**

`src/_utils/monthGrid.ts`:

```ts
import type { Dayjs } from 'dayjs';
import dayjs from '../_libs/dayjsJa';
import type { ScheduleEvent } from '../types/schedule';

export type MonthGridCell = {
  date: Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ScheduleEvent[];
};

// 週の始まりを月曜日にする(dayjsの.day()は日曜=0始まりのため、月曜=0になるよう補正する)
function mondayOffset(date: Dayjs): number {
  return (date.day() + 6) % 7;
}

export function buildMonthGrid(
  baseDate: Dayjs,
  events: ScheduleEvent[],
  today: Dayjs = dayjs()
): MonthGridCell[] {
  const startOfMonth = baseDate.startOf('month');
  const endOfMonth = baseDate.endOf('month');
  const gridStart = startOfMonth.subtract(mondayOffset(startOfMonth), 'day');
  const gridEnd = endOfMonth.add(6 - mondayOffset(endOfMonth), 'day');

  const cells: MonthGridCell[] = [];
  let cursor = gridStart;
  while (cursor.isSameOrBefore(gridEnd, 'day')) {
    cells.push({
      date: cursor,
      isCurrentMonth: cursor.isSame(baseDate, 'month'),
      isToday: cursor.isSame(today, 'day'),
      events: events.filter((event) => dayjs(event.startAt).isSame(cursor, 'day')),
    });
    cursor = cursor.add(1, 'day');
  }
  return cells;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_utils/monthGrid.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/monthGrid.ts src/_utils/monthGrid.test.ts
git commit -m "feat: 月間カレンダーグリッドの生成ロジックを追加"
```

---

### Task 7: API Route (`/api/timetree`)

**Files:**
- Create: `src/app/api/timetree/route.ts`
- Test: `src/app/api/timetree/route.test.ts`

**Interfaces:**
- Consumes: `loginToTimeTree` from `src/_libs/timetree/auth.ts` (Task 3)
- Consumes: `fetchAllEvents` from `src/_libs/timetree/calendar.ts` (Task 4)
- Produces: `GET` route handler at `/api/timetree` returning `{ events: ScheduleEvent[] }` (200) or `{ error: string }` (500/502) — Task 9 の `ScheduleContext` から `fetch('/api/timetree')` で呼ばれる。

- [ ] **Step 1: Write the failing test**

`src/app/api/timetree/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/app/api/timetree/route.test.ts`
Expected: FAIL with "Cannot find module './route'"

- [ ] **Step 3: Write minimal implementation**

`src/app/api/timetree/route.ts`:

```ts
import { loginToTimeTree } from '../../../_libs/timetree/auth';
import { fetchAllEvents } from '../../../_libs/timetree/calendar';

export async function GET() {
  const email = process.env.TIMETREE_EMAIL;
  const password = process.env.TIMETREE_PASSWORD;

  if (!email || !password) {
    return Response.json(
      { error: 'TIMETREE_EMAIL/TIMETREE_PASSWORDが設定されていません' },
      { status: 500 }
    );
  }

  try {
    const sessionId = await loginToTimeTree(email, password);
    const events = await fetchAllEvents(sessionId);
    return Response.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : '予期せぬエラーが発生しました';
    return Response.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/app/api/timetree/route.test.ts`
Expected: PASS (3 tests)

If `Response.json` is not defined in the Jest environment, add `testEnvironment: 'node'` via a per-file docblock (`/** @jest-environment node */` at the top of `route.test.ts`) rather than changing the global jest config.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/timetree/route.ts src/app/api/timetree/route.test.ts
git commit -m "feat: TimeTree予定取得のAPI Routeを追加"
```

---

### Task 8: globals.cssに予定表示用のフォントサイズクラスを追加

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/globals.test.ts`

**Interfaces:**
- Produces: CSS classes `.fs-schedule-title` (6.5vh) と `.fs-schedule-time` (8vh) — Task 10 の `UpcomingSchedule.tsx` が使う。

- [ ] **Step 1: Add the classes to globals.css**

`src/app/globals.css` の末尾(`.fs-clock` の後)に追記:

```css
/*
 * defaultモードの直近予定欄用。1mから一瞬で読める基準(globals.test.ts の
 * DISTANCE_READABLE)を満たすため、他の遠距離層と同じ考え方でサイズを決めている。
 * タイトルは漢字混じりのため6.5vh、時刻は数字のみで実インクが小さいため8vh。
 */
.fs-schedule-title {
  font-size: calc(6.5vh * var(--scale, 1));
}
.fs-schedule-time {
  font-size: calc(8vh * var(--scale, 1));
}
```

- [ ] **Step 2: Register the new classes in the distance-readability test**

`src/app/globals.test.ts` の `DISTANCE_READABLE` 配列を次のように変更する(既存の3件に2件追加):

```ts
const DISTANCE_READABLE = [
  { className: 'fs-clock', script: 'digit', usage: '時刻' },
  { className: 'fs-today-telop', script: 'kanji', usage: '今日の天気' },
  { className: 'fs-today-temp', script: 'digit', usage: '今日の気温' },
  { className: 'fs-schedule-title', script: 'kanji', usage: '直近予定のタイトル' },
  { className: 'fs-schedule-time', script: 'digit', usage: '直近予定の時刻' },
] as const;
```

- [ ] **Step 3: Run the test to verify the new classes pass the 5mm threshold**

Run: `pnpm run test src/app/globals.test.ts`
Expected: PASS — `it.each(DISTANCE_READABLE)` が新しい2行を自動的に検証する。

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat: 直近予定表示用の1m可読フォントサイズクラスを追加"
```

---

### Task 9: ScheduleContext と page.tsx への組み込み

**Files:**
- Create: `src/_contexts/ScheduleContext.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `ScheduleEvent` type from `src/types/schedule.ts` (Task 3)
- Produces: `useSchedule(): { events: ScheduleEvent[] | null; loading: boolean; error: string | null }` — Task 10, 12 のコンポーネントから使う。
- Produces: `ScheduleProvider` — `page.tsx` に組み込む。

既存の `src/_contexts/WeatherContext.tsx` と同じパターン(マウント時fetch + 5分ごとの再取得 + 失敗時は前回値を保持)を踏襲する。既存のContextにユニットテストは無い(`WeatherContext.tsx` 等も同様)ため、このタスクでも新規テストは追加しない。

- [ ] **Step 1: Write the implementation**

`src/_contexts/ScheduleContext.tsx`:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ScheduleEvent } from '../types/schedule';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

type ScheduleContextType = {
  events: ScheduleEvent[] | null;
  loading: boolean;
  error: string | null;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      // loading の初期値は true。再取得時に true へ戻さないことで、
      // 5分ごとの更新中も前回のデータを表示し続けられる(WeatherContextと同じ方針)
      const response = await fetch('/api/timetree');
      if (!response.ok) {
        throw new Error('予定の取得に失敗しました');
      }
      const data: { events: ScheduleEvent[] } = await response.json();
      setEvents(data.events);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setStateはすべてawait後に実行される非同期関数で、マウント時fetch+定期更新の標準パターン
    fetchSchedule();
    const interval = setInterval(fetchSchedule, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScheduleContext.Provider value={{ events, loading, error }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
```

- [ ] **Step 2: Wire it into page.tsx**

`src/app/page.tsx` を変更する。まず import を追加:

```diff
 import { TimeProvider } from "../_contexts/TimeContext";
 import { WeatherProvider } from "../_contexts/WeatherContext";
 import { HourlyWeatherProvider } from "../_contexts/HourlyWeatherContext";
+import { ScheduleProvider } from "../_contexts/ScheduleContext";
 import { DisplayModeProvider } from "../_contexts/DisplayModeContext";
```

`Home` 関数のProvider ネストを変更:

```diff
   return (
     <TimeProvider>
       <WeatherProvider>
         <HourlyWeatherProvider>
-          <DisplayModeProvider>
-            <MainContent />
-          </DisplayModeProvider>
+          <ScheduleProvider>
+            <DisplayModeProvider>
+              <MainContent />
+            </DisplayModeProvider>
+          </ScheduleProvider>
         </HourlyWeatherProvider>
       </WeatherProvider>
     </TimeProvider>
   );
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `pnpm run test`
Expected: PASS — 既存のテストに影響がないこと。

- [ ] **Step 4: Commit**

```bash
git add src/_contexts/ScheduleContext.tsx src/app/page.tsx
git commit -m "feat: TimeTree予定を保持するScheduleContextを追加"
```

---

### Task 10: defaultモードの直近予定カード (`UpcomingSchedule.tsx`)

**Files:**
- Create: `src/_components/UpcomingSchedule.tsx`
- Test: `src/_components/UpcomingSchedule.test.tsx`

**Interfaces:**
- Consumes: `useSchedule` from `src/_contexts/ScheduleContext.tsx` (Task 9)
- Consumes: `pickUpcomingEvents` from `src/_utils/upcomingSchedule.ts` (Task 5)
- Produces: `<UpcomingSchedule now={Dayjs} />` component — Task 11 で `Dashboard.tsx` に組み込む。

- [ ] **Step 1: Write the failing test**

`src/_components/UpcomingSchedule.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { UpcomingSchedule } from './UpcomingSchedule';
import { useSchedule } from '../_contexts/ScheduleContext';
import dayjs from '../_libs/dayjsJa';

jest.mock('../_contexts/ScheduleContext');

describe('UpcomingSchedule', () => {
  const now = dayjs('2026-08-28T10:00:00+09:00');

  it('エラー時はエラーメッセージを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: null,
      loading: false,
      error: '予定の取得に失敗しました',
    });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('予定の取得に失敗しました')).toBeInTheDocument();
  });

  it('予定がない場合は「予定はありません」と表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({ events: [], loading: false, error: null });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('予定はありません')).toBeInTheDocument();
  });

  it('直近の予定を日付・時刻・タイトルとともに表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: [
        {
          id: '1',
          title: '健診',
          startAt: '2026-08-29T09:00:00+09:00',
          endAt: '2026-08-29T10:00:00+09:00',
          allDay: false,
        },
      ],
      loading: false,
      error: null,
    });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('健診')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('8/29(土)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_components/UpcomingSchedule.test.tsx`
Expected: FAIL with "Cannot find module './UpcomingSchedule'"

- [ ] **Step 3: Write minimal implementation**

`src/_components/UpcomingSchedule.tsx`:

```tsx
'use client';

import { Dayjs } from 'dayjs';
import { useSchedule } from '../_contexts/ScheduleContext';
import { pickUpcomingEvents } from '../_utils/upcomingSchedule';

const UPCOMING_COUNT = 5;

type UpcomingScheduleProps = {
  now: Dayjs;
};

export function UpcomingSchedule({ now }: UpcomingScheduleProps) {
  const { events, loading, error } = useSchedule();

  if (!events) {
    if (loading) {
      return (
        <section className="panel flex min-h-0 flex-col items-center justify-center p-[2vh]">
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-accent"></div>
        </section>
      );
    }
    if (error) {
      return (
        <section className="panel flex min-h-0 flex-col items-center justify-center p-[2vh]">
          <p className="fs-md text-hot">{error}</p>
        </section>
      );
    }
    return null;
  }

  const items = pickUpcomingEvents(events, now, UPCOMING_COUNT);

  return (
    <section className="panel flex min-h-0 flex-col p-[2vh]">
      <h3 className="card-title fs-sm shrink-0 self-center font-bold">よてい</h3>
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="fs-md font-medium text-ink-faint">予定はありません</p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-center gap-[1vh] overflow-hidden">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-[1.2vh]">
              <span className="fs-xs shrink-0 text-ink-faint">{item.dateLabel}</span>
              {item.timeLabel && (
                <span className="fs-schedule-time shrink-0 font-bold text-accent-ink">
                  {item.timeLabel}
                </span>
              )}
              <span className="fs-schedule-title truncate font-bold leading-tight text-ink">
                {item.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_components/UpcomingSchedule.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_components/UpcomingSchedule.tsx src/_components/UpcomingSchedule.test.tsx
git commit -m "feat: defaultモードに直近予定カードを追加"
```

---

### Task 11: Weather.tsxを2日表示に変更し、Dashboard.tsxのdefaultレイアウトに組み込む

**Files:**
- Modify: `src/_components/Weather.tsx`
- Modify: `src/_components/Dashboard.tsx`

**Interfaces:**
- Consumes: `UpcomingSchedule` from `src/_components/UpcomingSchedule.tsx` (Task 10)

- [ ] **Step 1: Reduce Weather.tsx to 2 days**

`src/_components/Weather.tsx` を変更する:

```diff
-const DAY_LABELS = ['今日', '明日', '明後日'];
+const DAY_LABELS = ['今日', '明日'];
```

```diff
   return (
     // 今日のカードだけ広くする。大きくした天気 telop と気温を折り返さずに収めるため
-    <div className="grid h-full min-h-0 grid-cols-[1.5fr_1fr_1fr] gap-[2.5vh]">
-      {weather.forecasts.slice(0, 3).map((forecast, index) => (
+    <div className="grid h-full min-h-0 grid-cols-[1.5fr_1fr] gap-[2.5vh]">
+      {weather.forecasts.slice(0, 2).map((forecast, index) => (
         <WeatherCard
           key={forecast.date}
           forecast={forecast}
           date={dates[index]}
           dayLabel={DAY_LABELS[index]}
           isToday={index === 0}
         />
       ))}
     </div>
   );
```

- [ ] **Step 2: Update Dashboard.tsx's default mode layout**

`src/_components/Dashboard.tsx` の import に追加:

```diff
 import { Garbage } from "./Garbage";
+import { UpcomingSchedule } from "./UpcomingSchedule";
```

`default` ケースの下段を変更:

```diff
-        return (
-          /* 下段が厚いのは、今日の天気と気温を 1m 先から読める大きさで置くため。
-             減った上段の分は服装・ゴミのイラストが縮んで吸収する(時計は影響を受けない) */
-          <div className="grid h-full grid-rows-[5fr_8fr] gap-[2.5vh] p-[2.5vh] pb-[3.5vh]">
-            <div className="grid min-h-0 grid-cols-[1.2fr_1fr_1fr] gap-[2.5vh]">
-              <section className="panel flex items-center justify-center">
-                <Clock />
-              </section>
-              <ClothingIndexCard />
-              <section className="panel min-h-0">
-                <Garbage date={dates[0]} />
-              </section>
-            </div>
-            <div className="min-h-0">
-              <Weather dates={dates} />
-            </div>
-          </div>
-        );
+        return (
+          /* 下段が厚いのは、今日の天気と気温を 1m 先から読める大きさで置くため。
+             減った上段の分は服装・ゴミのイラストが縮んで吸収する(時計は影響を受けない)。
+             下段は「今日・明日の天気」+「直近の予定」の2列構成にしている */
+          <div className="grid h-full grid-rows-[5fr_8fr] gap-[2.5vh] p-[2.5vh] pb-[3.5vh]">
+            <div className="grid min-h-0 grid-cols-[1.2fr_1fr_1fr] gap-[2.5vh]">
+              <section className="panel flex items-center justify-center">
+                <Clock />
+              </section>
+              <ClothingIndexCard />
+              <section className="panel min-h-0">
+                <Garbage date={dates[0]} />
+              </section>
+            </div>
+            <div className="grid min-h-0 grid-cols-[1.7fr_1fr] gap-[2.5vh]">
+              <Weather dates={dates} />
+              <UpcomingSchedule now={dates[0]} />
+            </div>
+          </div>
+        );
```

- [ ] **Step 3: Run the full test suite**

Run: `pnpm run test`
Expected: PASS — 既存のテストに影響がないこと(`Weather.tsx` にはユニットテストが無いため、レイアウト変更で壊れるテストはない)。

- [ ] **Step 4: Visual check**

Run: `pnpm run dev` を起動し、Playwright MCPで `http://localhost:3000` を開き、defaultモードで下段が「今日・明日の天気」+「直近の予定」の3枚になっていること、レイアウトが崩れていないことをスクリーンショットで確認する。

- [ ] **Step 5: Commit**

```bash
git add src/_components/Weather.tsx src/_components/Dashboard.tsx
git commit -m "feat: defaultモードの天気表示を2日分にし、直近予定カードを配置する"
```

---

### Task 12: 専用モード用の月間カレンダーコンポーネント (`Schedule.tsx`)

**Files:**
- Create: `src/_components/Schedule.tsx`
- Test: `src/_components/Schedule.test.tsx`

**Interfaces:**
- Consumes: `useSchedule` from `src/_contexts/ScheduleContext.tsx` (Task 9)
- Consumes: `buildMonthGrid` from `src/_utils/monthGrid.ts` (Task 6)
- Produces: `<Schedule today={Dayjs} />` component — Task 13 で `Dashboard.tsx` の `schedule` モードに組み込む。

- [ ] **Step 1: Write the failing test**

`src/_components/Schedule.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Schedule } from './Schedule';
import { useSchedule } from '../_contexts/ScheduleContext';
import dayjs from '../_libs/dayjsJa';

jest.mock('../_contexts/ScheduleContext');

describe('Schedule', () => {
  const today = dayjs('2026-08-28');

  it('取得できたら年月の見出しを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({ events: [], loading: false, error: null });

    render(<Schedule today={today} />);

    expect(screen.getByText('よてい 2026年8月')).toBeInTheDocument();
  });

  it('該当日のセルに予定タイトルを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: [
        {
          id: '1',
          title: '健診',
          startAt: '2026-08-29T09:00:00+09:00',
          endAt: '2026-08-29T10:00:00+09:00',
          allDay: false,
        },
      ],
      loading: false,
      error: null,
    });

    render(<Schedule today={today} />);

    expect(screen.getByText('健診')).toBeInTheDocument();
  });

  it('1セルに3件以上ある場合は上限を超えた件数を「+N件」で表示する', () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      id: `${i}`,
      title: `予定${i}`,
      startAt: '2026-08-29T09:00:00+09:00',
      endAt: '2026-08-29T10:00:00+09:00',
      allDay: false,
    }));
    (useSchedule as jest.Mock).mockReturnValue({ events, loading: false, error: null });

    render(<Schedule today={today} />);

    expect(screen.getByText('+2件')).toBeInTheDocument();
  });

  it('エラー時はエラーメッセージを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: null,
      loading: false,
      error: '予定の取得に失敗しました',
    });

    render(<Schedule today={today} />);

    expect(screen.getByText('予定の取得に失敗しました')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test src/_components/Schedule.test.tsx`
Expected: FAIL with "Cannot find module './Schedule'"

- [ ] **Step 3: Write minimal implementation**

`src/_components/Schedule.tsx`:

```tsx
'use client';

import { Dayjs } from 'dayjs';
import { useSchedule } from '../_contexts/ScheduleContext';
import { buildMonthGrid } from '../_utils/monthGrid';

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
const MAX_VISIBLE_EVENTS_PER_CELL = 2;

type ScheduleProps = {
  today: Dayjs;
};

export function Schedule({ today }: ScheduleProps) {
  const { events, loading, error } = useSchedule();

  if (!events) {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-[6vh] w-[6vh] animate-spin rounded-full border-b-2 border-accent"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="fs-md text-hot">{error}</p>
        </div>
      );
    }
    return null;
  }

  const cells = buildMonthGrid(today, events, today);
  const rowCount = cells.length / 7;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[1vh]">
      <h2 className="card-title fs-md shrink-0 self-start font-bold">
        よてい {today.format('YYYY年M月')}
      </h2>
      <div className="grid shrink-0 grid-cols-7 gap-[0.4vh]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="fs-2xs text-center font-bold text-ink-faint">
            {label}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-[0.4vh]"
        style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.date.format('YYYY-MM-DD')}
            className={`flex min-h-0 flex-col gap-[0.2vh] rounded-[0.8vh] p-[0.6vh] ${
              cell.isToday ? 'panel-accent' : cell.isCurrentMonth ? 'bg-soft' : ''
            }`}
          >
            <span
              className={`fs-2xs font-bold ${
                cell.isCurrentMonth ? 'text-ink-soft' : 'text-ink-faint opacity-50'
              }`}
            >
              {cell.date.date()}
            </span>
            {cell.events.slice(0, MAX_VISIBLE_EVENTS_PER_CELL).map((event) => (
              <span
                key={event.id}
                className="fs-2xs truncate rounded-[0.4vh] bg-accent px-[0.4vh] text-on-accent"
              >
                {event.title}
              </span>
            ))}
            {cell.events.length > MAX_VISIBLE_EVENTS_PER_CELL && (
              <span className="fs-2xs text-ink-faint">
                +{cell.events.length - MAX_VISIBLE_EVENTS_PER_CELL}件
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test src/_components/Schedule.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_components/Schedule.tsx src/_components/Schedule.test.tsx
git commit -m "feat: 月間カレンダー表示のScheduleコンポーネントを追加"
```

---

### Task 13: `schedule` モードをDisplayModeContextとDashboardに組み込む

**Files:**
- Modify: `src/_contexts/DisplayModeContext.tsx`
- Modify: `src/_components/Dashboard.tsx`

**Interfaces:**
- Consumes: `Schedule` from `src/_components/Schedule.tsx` (Task 12)

- [ ] **Step 1: Add 'schedule' to DISPLAY_MODES**

`src/_contexts/DisplayModeContext.tsx` を変更する:

```diff
-export const DISPLAY_MODES = ['default', 'weather', 'clock', 'garbage'] as const;
+export const DISPLAY_MODES = ['default', 'weather', 'schedule', 'clock', 'garbage'] as const;
```

- [ ] **Step 2: Add the 'schedule' case to Dashboard.tsx**

`src/_components/Dashboard.tsx` の import に追加:

```diff
 import { WeatherDetail } from "./WeatherDetail";
+import { Schedule } from "./Schedule";
```

`renderContent` の `switch` に `weather` ケースの直後で `schedule` ケースを追加:

```diff
       case 'weather':
         return (
           <div className="h-full p-[3vh]" style={fullscreenStyle(1.3)}>
             <WeatherDetail dates={dates} />
           </div>
         );
+      case 'schedule':
+        return (
+          <div className="h-full p-[3vh]" style={fullscreenStyle(1)}>
+            <Schedule today={dates[0]} />
+          </div>
+        );
       default:
```

- [ ] **Step 3: Run the full test suite**

Run: `pnpm run test`
Expected: PASS

- [ ] **Step 4: Visual check**

`pnpm run dev` を起動し、Playwright MCPで画面をクリックしてモードを一周させ、`default → weather → schedule → clock → garbage → default` の順で巡回すること、`schedule` モードで月間グリッドがレイアウト崩れなく表示されることを確認する。

- [ ] **Step 5: Commit**

```bash
git add src/_contexts/DisplayModeContext.tsx src/_components/Dashboard.tsx
git commit -m "feat: 予定専用モード(schedule)を表示モードの巡回に追加"
```

---

### Task 14: README.mdの更新

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the display mode list**

`README.md` の「表示モード」セクションを変更:

```diff
 ```
-default（全部表示） → weather → clock → garbage → default …
+default（全部表示） → weather → schedule → clock → garbage → default …
 ```

-`default` 以外は該当カードを 1 枚だけ拡大して全画面表示する。`clock` `garbage` は離れた場所から見るときに使う。`weather` は 3 時間おきの時間帯別詳細を表示するため、近づいて見る想定。
+`default` 以外は該当カードを 1 枚だけ拡大して全画面表示する。`clock` `garbage` は離れた場所から見るときに使う。`weather` は 3 時間おきの時間帯別詳細を、`schedule` は TimeTree の月間予定一覧を表示するため、どちらも近づいて見る想定。
```

- [ ] **Step 2: Document the new environment variables**

「セットアップ」セクションの後に新しいセクションを追加:

```markdown
## TimeTree予定表示とアクセス制限

TimeTreeの予定を表示するには、以下の環境変数が必要(`.env` に追加する)。

| 変数名 | 内容 |
| --- | --- |
| `TIMETREE_EMAIL` | TimeTreeのログインメールアドレス |
| `TIMETREE_PASSWORD` | TimeTreeのログインパスワード |
| `BOARD_ACCESS_TOKEN` | ボード全体へのアクセスを保護するための秘密のトークン。未設定の場合は認証なしで誰でもアクセスできる |

TimeTreeの予定は[公式APIが2023年12月に終了しているため](https://timetreeapp.com/newsroom)、非公式のWeb APIを直接叩いて取得している(`src/_libs/timetree/`)。TimeTree側の仕様変更で予告なく動かなくなる可能性がある。

`BOARD_ACCESS_TOKEN` を設定した場合、`https://<デプロイ先>/?key=<トークンの値>` でアクセスした端末だけがCookie経由で以後も閲覧できるようになる(`src/proxy.ts`)。Raspberry Piのキオスクブラウザの起動URLには、常にこの `?key=` 付きのURLを設定しておくこと。こうしておけば、Piやブラウザを再起動してCookieが消えても、起動のたびに自動的に再認証される。
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: TimeTree予定表示とアクセス制限の環境変数をREADMEに追記"
```

---

## Post-Implementation Notes (for the human operator, not an agent task)

計画には含めていないが、機能を実際に使うには以下がこのリポジトリの外で必要になる。エージェントに実行させず、ユーザー自身が行うこと。

1. **Vercelの環境変数設定**: `TIMETREE_EMAIL` / `TIMETREE_PASSWORD` / `BOARD_ACCESS_TOKEN` をVercelのプロジェクト設定に登録する。`BOARD_ACCESS_TOKEN` は `openssl rand -hex 16` などで生成する。
2. **Piのkiosk起動URLの変更**: systemd/autostart等の起動設定にある起動URLを `https://<デプロイ先>/?key=<BOARD_ACCESS_TOKENの値>` に変更する。
