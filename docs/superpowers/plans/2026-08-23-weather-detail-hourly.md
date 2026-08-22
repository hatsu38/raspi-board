# weatherモード時間帯別天気表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `weather` モード(全画面表示)を、今日/明日/明後日を3時間おきの表形式(時刻・天気アイコン・気温の折れ線グラフ・降水確率)で見せる詳細画面に置き換える。

**Architecture:** 新データソース Open-Meteo(APIキー不要、緯度経度指定で1時間ごとのデータを取得)を新規Context `HourlyWeatherContext` で取得し、新規コンポーネント `WeatherDetail` が3時間おきに間引いて表形式で描画する。既存の `WeatherContext` / `Weather.tsx`(defaultモード下段で使用)は変更しない。天気アイコンの種類判定を telop 由来と WMOコード由来の2系統で使えるように `WeatherIcon` の props を変更する。

**Tech Stack:** Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / dayjs / Jest + React Testing Library / Playwright

## Global Constraints

- パッケージマネージャは pnpm のみ。npm/yarn は使わない。
- コミットメッセージは日本語。`種別: 内容` の形式(例: `feat: ...` `docs: ...`)。
- 表示ハードウェアはスクロール不可の1920x1080横長ディスプレイ。文字サイズは `globals.css` の `.fs-*` を使い、`vh` 基準・`var(--scale, 1)` 追従で指定する(Tailwindの`text-*`は使わない)。
- dayjs は必ず `src/_libs/dayjsJa.ts` 経由でimportする(ja ロケール・プラグイン登録済み)。
- テストは純粋関数を優先する。日付やAPIレスポンスに依存するテストは毎回最小限のモックオブジェクトを組み立てる(既存モックの流用や共有ヘルパー化はしない)。
- defaultモード(トップページ)下段の `Weather.tsx` の表示内容は変更しない。
- `weather` モードの既存要素(telopの大きい文字、最高/最低気温、ゴミ出しバッジ)は廃止する。

---

### Task 1: WMOコード→アイコン種別の変換ユーティリティ

**Files:**
- Create: `src/_utils/weatherCode.ts`
- Test: `src/_utils/weatherCode.test.ts`
- Modify: `src/types/weather.ts`(`HourlyForecast`型を追加)

**Interfaces:**
- Consumes: `WeatherIconKind`(`src/_utils/weatherIcon.ts` からexport済み)
- Produces: `getWeatherIconKindFromCode(code: number): WeatherIconKind`、`getWeatherLabelFromCode(code: number): string`、型 `HourlyForecast`(`src/types/weather.ts`)

- [ ] **Step 1: `HourlyForecast`型を追加する**

`src/types/weather.ts` の末尾に追記:

```ts
export type HourlyForecast = {
  time: string; // ISO8601 (Asia/Tokyo, 例: "2026-08-23T09:00")
  temperature: number;
  precipitationProbability: number;
  weatherCode: number; // WMO weather code
};
```

- [ ] **Step 2: 失敗するテストを書く**

`src/_utils/weatherCode.test.ts` を作成:

```ts
import { getWeatherIconKindFromCode, getWeatherLabelFromCode } from './weatherCode';

describe('getWeatherIconKindFromCode', () => {
  it('コード0(晴れ)は sunny になる', () => {
    expect(getWeatherIconKindFromCode(0)).toBe('sunny');
  });

  it('コード2(晴れ時々曇り)は sunny-cloudy になる', () => {
    expect(getWeatherIconKindFromCode(2)).toBe('sunny-cloudy');
  });

  it('コード3(曇り)は cloudy になる', () => {
    expect(getWeatherIconKindFromCode(3)).toBe('cloudy');
  });

  it('コード61(弱い雨)は cloudy-rain になる', () => {
    expect(getWeatherIconKindFromCode(61)).toBe('cloudy-rain');
  });

  it('コード65(強い雨)は heavy-rain になる', () => {
    expect(getWeatherIconKindFromCode(65)).toBe('heavy-rain');
  });

  it('コード71(弱い雪)は snow になる', () => {
    expect(getWeatherIconKindFromCode(71)).toBe('snow');
  });

  it('コード95(雷雨)は thunder になる', () => {
    expect(getWeatherIconKindFromCode(95)).toBe('thunder');
  });

  it('未知のコードは cloudy にフォールバックする', () => {
    expect(getWeatherIconKindFromCode(9999)).toBe('cloudy');
  });
});

describe('getWeatherLabelFromCode', () => {
  it('コード0(晴れ)は「晴れ」になる', () => {
    expect(getWeatherLabelFromCode(0)).toBe('晴れ');
  });

  it('コード61(弱い雨)は「弱い雨」になる', () => {
    expect(getWeatherLabelFromCode(61)).toBe('弱い雨');
  });

  it('未知のコードは「不明」にフォールバックする', () => {
    expect(getWeatherLabelFromCode(9999)).toBe('不明');
  });
});
```

- [ ] **Step 3: テストを実行し、失敗を確認する**

Run: `pnpm run test weatherCode`
Expected: FAIL(`weatherCode.ts` が存在しないため `Cannot find module './weatherCode'`)

- [ ] **Step 4: 実装する**

`src/_utils/weatherCode.ts` を作成:

```ts
import type { WeatherIconKind } from './weatherIcon';

type WeatherCodeMapping = { kind: WeatherIconKind; label: string };

// Open-Meteo が返す WMO weather code の対応表
// (https://open-meteo.com/en/docs で定義されている値のみを対象にする)
const WEATHER_CODE_TO_MAPPING: Record<number, WeatherCodeMapping> = {
  0: { kind: 'sunny', label: '晴れ' },
  1: { kind: 'sunny-cloudy', label: 'ほぼ晴れ' },
  2: { kind: 'sunny-cloudy', label: '晴れ時々曇り' },
  3: { kind: 'cloudy', label: '曇り' },
  45: { kind: 'cloudy', label: '霧' },
  48: { kind: 'cloudy', label: '霧' },
  51: { kind: 'cloudy-rain', label: '弱い霧雨' },
  53: { kind: 'cloudy-rain', label: '霧雨' },
  55: { kind: 'rain', label: '強い霧雨' },
  56: { kind: 'cloudy-rain', label: '弱い着氷性の霧雨' },
  57: { kind: 'rain', label: '着氷性の霧雨' },
  61: { kind: 'cloudy-rain', label: '弱い雨' },
  63: { kind: 'rain', label: '雨' },
  65: { kind: 'heavy-rain', label: '強い雨' },
  66: { kind: 'cloudy-rain', label: '弱い着氷性の雨' },
  67: { kind: 'heavy-rain', label: '着氷性の雨' },
  71: { kind: 'snow', label: '弱い雪' },
  73: { kind: 'snow', label: '雪' },
  75: { kind: 'snow', label: '強い雪' },
  77: { kind: 'snow', label: '雪(霧雪)' },
  80: { kind: 'cloudy-rain', label: '弱いにわか雨' },
  81: { kind: 'rain', label: 'にわか雨' },
  82: { kind: 'heavy-rain', label: '強いにわか雨' },
  85: { kind: 'snow', label: '弱いにわか雪' },
  86: { kind: 'snow', label: '強いにわか雪' },
  95: { kind: 'thunder', label: '雷雨' },
  96: { kind: 'thunder', label: '雷雨(弱い雹)' },
  99: { kind: 'thunder', label: '雷雨(強い雹)' },
};

const FALLBACK_MAPPING: WeatherCodeMapping = { kind: 'cloudy', label: '不明' };

/**
 * Open-Meteo の WMO weather code から自作アイコンの種類を決める。
 * telop ベースの getWeatherIconKind と異なり、コードは既知の有限集合のため
 * 未知の値でも null を返さず 'cloudy' にフォールバックする。
 */
export function getWeatherIconKindFromCode(code: number): WeatherIconKind {
  return (WEATHER_CODE_TO_MAPPING[code] ?? FALLBACK_MAPPING).kind;
}

/** aria-label などに使う日本語ラベル */
export function getWeatherLabelFromCode(code: number): string {
  return (WEATHER_CODE_TO_MAPPING[code] ?? FALLBACK_MAPPING).label;
}
```

- [ ] **Step 5: テストを実行し、成功を確認する**

Run: `pnpm run test weatherCode`
Expected: PASS(11 tests)

- [ ] **Step 6: コミット**

```bash
git add src/types/weather.ts src/_utils/weatherCode.ts src/_utils/weatherCode.test.ts
git commit -m "feat: WMOコードから天気アイコン種別を判定するユーティリティを追加"
```

---

### Task 2: 時間帯別データの抽出ユーティリティ

**Files:**
- Create: `src/_utils/hourlyForecastGrouping.ts`
- Test: `src/_utils/hourlyForecastGrouping.test.ts`

**Interfaces:**
- Consumes: `HourlyForecast`(Task 1で追加、`src/types/weather.ts`)、`Dayjs`(`dayjs`)
- Produces: `groupHourlyForecastByDay(hourly: HourlyForecast[], dates: Dayjs[]): HourlyForecast[][]`(`dates` と同じ長さの配列。各要素はその日のうち3時間おき(0,3,6,...,21時)のデータだけを含む配列)

- [ ] **Step 1: 失敗するテストを書く**

`src/_utils/hourlyForecastGrouping.test.ts` を作成:

```ts
import dayjs from '../_libs/dayjsJa';
import { groupHourlyForecastByDay } from './hourlyForecastGrouping';
import type { HourlyForecast } from '../types/weather';

function createHourlyForecast(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time: '2026-08-23T00:00',
    temperature: 20,
    precipitationProbability: 0,
    weatherCode: 0,
    ...overrides,
  };
}

describe('groupHourlyForecastByDay', () => {
  it('3時間おきの時刻だけを、日付ごとに抽出する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00' }),
      createHourlyForecast({ time: '2026-08-23T01:00' }),
      createHourlyForecast({ time: '2026-08-23T03:00' }),
      createHourlyForecast({ time: '2026-08-24T00:00' }),
      createHourlyForecast({ time: '2026-08-24T03:00' }),
      createHourlyForecast({ time: '2026-08-25T00:00' }),
    ];
    const dates = [dayjs('2026-08-23'), dayjs('2026-08-24'), dayjs('2026-08-25')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result[0].map((f) => f.time)).toEqual(['2026-08-23T00:00', '2026-08-23T03:00']);
    expect(result[1].map((f) => f.time)).toEqual(['2026-08-24T00:00', '2026-08-24T03:00']);
    expect(result[2].map((f) => f.time)).toEqual(['2026-08-25T00:00']);
  });

  it('該当する日付のデータが1件もない場合は空配列を返す', () => {
    const hourly: HourlyForecast[] = [createHourlyForecast({ time: '2026-08-23T00:00' })];
    const dates = [dayjs('2026-08-30')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result).toEqual([[]]);
  });

  it('各要素の温度・降水確率・天気コードもそのまま保持する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({
        time: '2026-08-23T09:00',
        temperature: 27.4,
        precipitationProbability: 40,
        weatherCode: 61,
      }),
    ];
    const dates = [dayjs('2026-08-23')];

    const result = groupHourlyForecastByDay(hourly, dates);

    expect(result[0]).toEqual([
      { time: '2026-08-23T09:00', temperature: 27.4, precipitationProbability: 40, weatherCode: 61 },
    ]);
  });
});
```

- [ ] **Step 2: テストを実行し、失敗を確認する**

Run: `pnpm run test hourlyForecastGrouping`
Expected: FAIL(`Cannot find module './hourlyForecastGrouping'`)

- [ ] **Step 3: 実装する**

`src/_utils/hourlyForecastGrouping.ts` を作成:

```ts
import type { Dayjs } from 'dayjs';
import type { HourlyForecast } from '../types/weather';

const SLOT_INTERVAL_HOURS = 3;

/**
 * 1時間ごとの予報配列を、指定した日付ごとに3時間おき(0,3,6,...,21時)へ間引く。
 * スクロールできない画面に収めるための間引きで、今日・明日・明後日とも同じ間隔にする。
 */
export function groupHourlyForecastByDay(
  hourly: HourlyForecast[],
  dates: Dayjs[]
): HourlyForecast[][] {
  return dates.map((date) => {
    const dateKey = date.format('YYYY-MM-DD');
    return hourly.filter((entry) => {
      if (!entry.time.startsWith(dateKey)) return false;
      const hour = Number(entry.time.slice(11, 13));
      return hour % SLOT_INTERVAL_HOURS === 0;
    });
  });
}
```

- [ ] **Step 4: テストを実行し、成功を確認する**

Run: `pnpm run test hourlyForecastGrouping`
Expected: PASS(3 tests)

- [ ] **Step 5: コミット**

```bash
git add src/_utils/hourlyForecastGrouping.ts src/_utils/hourlyForecastGrouping.test.ts
git commit -m "feat: 時間帯別予報を3時間おきに間引くユーティリティを追加"
```

---

### Task 3: WeatherIcon を kind 直接指定に変更する

**Files:**
- Modify: `src/_components/WeatherIcon.tsx`
- Modify: `src/_components/Weather.tsx:1-8,131`

**Interfaces:**
- Consumes: `WeatherIconKind`(既存)
- Produces: `WeatherIcon({ kind, fallbackUrl, label }: { kind: WeatherIconKind | null; fallbackUrl?: string; label: string })`(telopの代わりに呼び出し側が判定済みの`kind`と`label`を渡す)

今回はテスト対象の振る舞いを変えないリファクタ(telopからkindへの変換を呼び出し側へ移すだけ)。既存のプロダクトコードにも `WeatherIcon` 専用のテストは無いため、既存テストスイート全体が壊れていないことで確認する。

- [ ] **Step 1: `WeatherIcon.tsx` を変更する**

`src/_components/WeatherIcon.tsx` の型宣言と本体を変更:

```tsx
type WeatherIconProps = {
  kind: WeatherIconKind | null;
  /** kind が判定できなかったときに表示する天気 API の公式アイコン */
  fallbackUrl?: string;
  /** aria-label と、fallback画像のaltに使うラベル */
  label: string;
};
```

(冒頭の `import { getWeatherIconKind, type WeatherIconKind } from '../_utils/weatherIcon';` は `import type { WeatherIconKind } from '../_utils/weatherIcon';` に変更し、`getWeatherIconKind` のimportを削除する)

コンポーネント本体を変更:

```tsx
export function WeatherIcon({ kind, fallbackUrl, label }: WeatherIconProps) {
  if (!kind) {
    if (!fallbackUrl) return null;
    return <Image src={fallbackUrl} alt={label} fill className="object-contain" />;
  }

  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={label} className="h-full w-full">
      {ICONS[kind]}
    </svg>
  );
}
```

- [ ] **Step 2: `Weather.tsx` の呼び出し側を変更する**

import に追加(`src/_components/Weather.tsx` 冒頭):

```tsx
import { getWeatherIconKind } from "../_utils/weatherIcon";
```

呼び出し箇所(`src/_components/Weather.tsx` の該当行)を変更:

```tsx
<WeatherIcon
  kind={getWeatherIconKind(forecast.telop)}
  fallbackUrl={forecast.image?.url}
  label={forecast.telop}
/>
```

- [ ] **Step 3: 既存テストとlintを実行し、壊れていないことを確認する**

Run: `pnpm run test`
Expected: PASS(既存の全テストが通る。`weatherIcon.test.ts` は対象外の純粋関数のみをテストしているため影響を受けない)

Run: `pnpm run lint`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/_components/WeatherIcon.tsx src/_components/Weather.tsx
git commit -m "refactor: WeatherIconがtelopではなくkindを直接受け取るようにする"
```

---

### Task 4: Open-Meteo から時間帯別データを取得する Context

**Files:**
- Create: `src/_contexts/HourlyWeatherContext.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `HourlyForecast`(Task 1)
- Produces: `HourlyWeatherProvider({ children })`、`useHourlyWeather(): { hourlyForecast: HourlyForecast[] | null; loading: boolean; error: string | null }`

Open-Meteo へのfetchを行うContextのため、既存の `WeatherContext.tsx` 同様に専用のユニットテストは置かない(このリポジトリではfetchを行うContext自体はテストしていない)。型検査とlintで確認し、実際の取得確認はTask 9のPlaywright MCPでの目視確認で行う。

- [ ] **Step 1: `HourlyWeatherContext.tsx` を作成する**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { HourlyForecast } from "../types/weather";

const CHIBA_LATITUDE = 35.6073;
const CHIBA_LONGITUDE = 140.1063;
const OPEN_METEO_PARAMS = new URLSearchParams({
  latitude: String(CHIBA_LATITUDE),
  longitude: String(CHIBA_LONGITUDE),
  hourly: 'temperature_2m,precipitation_probability,weathercode',
  timezone: 'Asia/Tokyo',
  forecast_days: '3',
});
const OPEN_METEO_API_BASE_URL = `https://api.open-meteo.com/v1/forecast?${OPEN_METEO_PARAMS.toString()}`;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
  };
};

function toHourlyForecasts(data: OpenMeteoResponse): HourlyForecast[] {
  return data.hourly.time.map((time, index) => ({
    time,
    temperature: data.hourly.temperature_2m[index],
    precipitationProbability: data.hourly.precipitation_probability[index],
    weatherCode: data.hourly.weathercode[index],
  }));
}

type HourlyWeatherContextType = {
  hourlyForecast: HourlyForecast[] | null;
  loading: boolean;
  error: string | null;
};

const HourlyWeatherContext = createContext<HourlyWeatherContextType | undefined>(undefined);

export function HourlyWeatherProvider({ children }: { children: ReactNode }) {
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHourlyWeather = async () => {
    try {
      // loading の初期値は true。再取得時に true へ戻さないことで、
      // 5分ごとの更新中も前回のデータを表示し続けられる
      const response = await fetch(OPEN_METEO_API_BASE_URL);
      if (!response.ok) {
        throw new Error('時間帯別の天気情報の取得に失敗しました');
      }
      const data: OpenMeteoResponse = await response.json();
      setHourlyForecast(toHourlyForecasts(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setStateはすべてawait後に実行される非同期関数で、マウント時fetch+定期更新の標準パターン
    fetchHourlyWeather();
    const interval = setInterval(fetchHourlyWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <HourlyWeatherContext.Provider value={{ hourlyForecast, loading, error }}>
      {children}
    </HourlyWeatherContext.Provider>
  );
}

export function useHourlyWeather() {
  const context = useContext(HourlyWeatherContext);
  if (context === undefined) {
    throw new Error('useHourlyWeather must be used within a HourlyWeatherProvider');
  }
  return context;
}
```

- [ ] **Step 2: `page.tsx` にProviderを追加する**

`src/app/page.tsx` の import に追加:

```tsx
import { HourlyWeatherProvider } from "../_contexts/HourlyWeatherContext";
```

`Home` 関数のProvider入れ子を変更:

```tsx
  return (
    <TimeProvider>
      <WeatherProvider>
        <HourlyWeatherProvider>
          <DisplayModeProvider>
            <MainContent />
          </DisplayModeProvider>
        </HourlyWeatherProvider>
      </WeatherProvider>
    </TimeProvider>
  );
```

- [ ] **Step 3: lintとビルドで確認する**

Run: `pnpm run lint`
Expected: エラーなし

Run: `pnpm run build`
Expected: 型エラーなくビルドが成功する

- [ ] **Step 4: コミット**

```bash
git add src/_contexts/HourlyWeatherContext.tsx src/app/page.tsx
git commit -m "feat: Open-Meteoから時間帯別天気を取得するContextを追加"
```

---

### Task 5: 気温の折れ線グラフコンポーネント

**Files:**
- Create: `src/_components/TemperatureGraph.tsx`

**Interfaces:**
- Consumes: なし(数値配列のみを受け取る)
- Produces: `TemperatureGraph({ temperatures }: { temperatures: number[] })`

表示専用のSVGコンポーネントで、既存のテスト方針上ロジックを持たない見た目コンポーネントには専用テストを置いていない(例: `WeatherIcon.tsx`)。Task 6の `WeatherDetail` の中で描画されることを確認する。

- [ ] **Step 1: 実装する**

`src/_components/TemperatureGraph.tsx` を作成:

```tsx
'use client';

type TemperatureGraphProps = {
  temperatures: number[];
};

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 60;
const PADDING_Y = 8;

/*
 * 気温配列を折れ線で描く。日ごとの最高/最低で正規化するため、
 * 日によって気温の絶対値は違っても線の高さの起伏は常にフルスケールで見える。
 */
export function TemperatureGraph({ temperatures }: TemperatureGraphProps) {
  if (temperatures.length === 0) return null;

  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = max - min;

  const points = temperatures.map((temp, index) => {
    const x = ((index + 0.5) / temperatures.length) * VIEW_WIDTH;
    const ratio = range === 0 ? 0.5 : (temp - min) / range;
    const y = VIEW_HEIGHT - PADDING_Y - ratio * (VIEW_HEIGHT - PADDING_Y * 2);
    return { x, y, temp };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <polyline points={polylinePoints} fill="none" stroke="var(--hot)" strokeWidth="2" />
      {points.map((p, index) => (
        <text
          key={index}
          x={p.x}
          y={Math.max(p.y - 4, 8)}
          textAnchor="middle"
          fontSize="9"
          fill="var(--hot)"
          fontWeight="700"
        >
          {Math.round(p.temp)}°
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: lintで確認する**

Run: `pnpm run lint`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/_components/TemperatureGraph.tsx
git commit -m "feat: 気温を折れ線で描くTemperatureGraphコンポーネントを追加"
```

---

### Task 6: WeatherDetail コンポーネントと Dashboard への差し替え

**Files:**
- Create: `src/_components/WeatherDetail.tsx`
- Test: `src/_components/WeatherDetail.test.tsx`
- Modify: `src/_components/Dashboard.tsx`

**Interfaces:**
- Consumes: `useHourlyWeather()`(Task 4)、`groupHourlyForecastByDay()`(Task 2)、`getWeatherIconKindFromCode` / `getWeatherLabelFromCode`(Task 1)、`WeatherIcon`(Task 3)、`TemperatureGraph`(Task 5)
- Produces: `WeatherDetail({ dates }: { dates: Dayjs[] })`

- [ ] **Step 1: 失敗するテストを書く**

`src/_components/WeatherDetail.test.tsx` を作成:

```tsx
import { render, screen } from '@testing-library/react';
import dayjs from '../_libs/dayjsJa';
import { WeatherDetail } from './WeatherDetail';
import { useHourlyWeather } from '../_contexts/HourlyWeatherContext';
import type { HourlyForecast } from '../types/weather';

jest.mock('../_contexts/HourlyWeatherContext', () => ({
  useHourlyWeather: jest.fn(),
}));

const mockUseHourlyWeather = useHourlyWeather as jest.Mock;

function createHourlyForecast(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    time: '2026-08-23T00:00',
    temperature: 24,
    precipitationProbability: 10,
    weatherCode: 0,
    ...overrides,
  };
}

describe('WeatherDetail', () => {
  // 2026-08-23は日曜日、24日は月曜日、25日は火曜日
  const dates = [dayjs('2026-08-23'), dayjs('2026-08-24'), dayjs('2026-08-25')];

  it('ローディング中はスピナーを表示する', () => {
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: null, loading: true, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('エラー時はエラーメッセージを表示する', () => {
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: null, loading: false, error: '取得失敗' });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('取得失敗')).toBeInTheDocument();
  });

  it('3日分の日付見出しを表示する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00' }),
      createHourlyForecast({ time: '2026-08-23T03:00' }),
      createHourlyForecast({ time: '2026-08-24T00:00' }),
      createHourlyForecast({ time: '2026-08-24T03:00' }),
      createHourlyForecast({ time: '2026-08-25T00:00' }),
      createHourlyForecast({ time: '2026-08-25T03:00' }),
    ];
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: hourly, loading: false, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('今日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('明日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('明後日', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('8/23(日)')).toBeInTheDocument();
    expect(screen.getByText('8/24(月)')).toBeInTheDocument();
    expect(screen.getByText('8/25(火)')).toBeInTheDocument();
  });

  it('各日の降水確率を%表示する', () => {
    const hourly: HourlyForecast[] = [
      createHourlyForecast({ time: '2026-08-23T00:00', precipitationProbability: 40 }),
      createHourlyForecast({ time: '2026-08-24T00:00', precipitationProbability: 5 }),
      createHourlyForecast({ time: '2026-08-25T00:00', precipitationProbability: 0 }),
    ];
    mockUseHourlyWeather.mockReturnValue({ hourlyForecast: hourly, loading: false, error: null });

    render(<WeatherDetail dates={dates} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを実行し、失敗を確認する**

Run: `pnpm run test WeatherDetail`
Expected: FAIL(`Cannot find module './WeatherDetail'`)

- [ ] **Step 3: 実装する**

`src/_components/WeatherDetail.tsx` を作成:

```tsx
'use client';

import { Dayjs } from "dayjs";
import { useHourlyWeather } from "../_contexts/HourlyWeatherContext";
import { groupHourlyForecastByDay } from "../_utils/hourlyForecastGrouping";
import { getWeatherIconKindFromCode, getWeatherLabelFromCode } from "../_utils/weatherCode";
import { WeatherIcon } from "./WeatherIcon";
import { TemperatureGraph } from "./TemperatureGraph";
import type { HourlyForecast } from "../types/weather";

type WeatherDetailProps = {
  dates: Dayjs[];
};

const DAY_LABELS = ['今日', '明日', '明後日'];

type DayHourlyTableProps = {
  date: Dayjs;
  dayLabel: string;
  slots: HourlyForecast[];
  isToday: boolean;
};

function formatHour(time: string): string {
  return String(Number(time.slice(11, 13)));
}

const DayHourlyTable = ({ date, dayLabel, slots, isToday }: DayHourlyTableProps) => (
  <div
    className={`panel flex min-h-0 flex-col gap-[0.5vh] p-[1.2vh] ${isToday ? 'panel-accent' : ''}`}
    style={{ flex: isToday ? 1.5 : 1 }}
  >
    <div className="flex shrink-0 items-center gap-[1vh]">
      <span
        className={`fs-2xs rounded-full px-[1.2vh] py-[0.2vh] font-bold ${
          isToday ? 'bg-accent text-on-accent' : 'bg-soft text-ink-soft'
        }`}
      >
        {dayLabel}
      </span>
      <span className="fs-xs font-bold text-ink">
        {date.format('M/D')}({date.format('ddd')})
      </span>
    </div>

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <span key={slot.time} className="fs-2xs flex-1 text-center text-ink-faint">
            {formatHour(slot.time)}
          </span>
        ))}
      </div>
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <div key={slot.time} className="flex-1">
            <div className="relative mx-auto h-[calc(3vh*var(--scale,1))] w-[calc(3vh*var(--scale,1))]">
              <WeatherIcon
                kind={getWeatherIconKindFromCode(slot.weatherCode)}
                label={getWeatherLabelFromCode(slot.weatherCode)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <TemperatureGraph temperatures={slots.map((slot) => slot.temperature)} />
      </div>
      <div className="flex shrink-0">
        {slots.map((slot) => (
          <span key={slot.time} className="fs-2xs flex-1 text-center font-bold text-cold">
            {Math.round(slot.precipitationProbability)}%
          </span>
        ))}
      </div>
    </div>
  </div>
);

export function WeatherDetail({ dates }: WeatherDetailProps) {
  const { hourlyForecast, loading, error } = useHourlyWeather();

  // 定期再取得中は前回のデータを表示し続ける(スピナーやエラーで画面をチラつかせない)
  if (!hourlyForecast) {
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

  const dailySlots = groupHourlyForecastByDay(hourlyForecast, dates);

  return (
    <div className="flex h-full min-h-0 flex-col gap-[1.5vh]">
      {dailySlots.map((slots, index) => (
        <DayHourlyTable
          key={dates[index].format('YYYY-MM-DD')}
          date={dates[index]}
          dayLabel={DAY_LABELS[index]}
          slots={slots}
          isToday={index === 0}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: テストを実行し、成功を確認する**

Run: `pnpm run test WeatherDetail`
Expected: PASS(4 tests)

- [ ] **Step 5: `Dashboard.tsx` の `weather` ケースを差し替える**

`src/_components/Dashboard.tsx` の import に追加:

```tsx
import { WeatherDetail } from "./WeatherDetail";
```

`'weather'` ケースを変更:

```tsx
      case 'weather':
        return (
          <div className="h-full p-[3vh]" style={fullscreenStyle(1.3)}>
            <WeatherDetail dates={dates} />
          </div>
        );
```

(`import { Weather } from "./Weather";` と `default` ケース内の `<Weather dates={dates} />` はそのまま残す)

- [ ] **Step 6: 全テストとlintを実行する**

Run: `pnpm run test`
Expected: PASS(全テスト)

Run: `pnpm run lint`
Expected: エラーなし

- [ ] **Step 7: コミット**

```bash
git add src/_components/WeatherDetail.tsx src/_components/WeatherDetail.test.tsx src/_components/Dashboard.tsx
git commit -m "feat: weatherモードを時間帯別の表形式表示に差し替える"
```

---

### Task 7: E2Eフィクスチャの追加とテスト更新

**Files:**
- Modify: `e2e/fixtures/weather-mock.ts`
- Modify: `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: なし
- Produces: `OPEN_METEO_API_URL_PATTERN: string`、`OPEN_METEO_MOCK: object`(`e2e/fixtures/weather-mock.ts` からexport)

- [ ] **Step 1: Open-Meteo用の固定レスポンスを追加する**

`e2e/fixtures/weather-mock.ts` の末尾に追記:

```ts
// HourlyWeatherContext.tsx が実際にfetchするエンドポイント。
export const OPEN_METEO_API_URL_PATTERN = '**/v1/forecast**';

// WEATHER_MOCK と同じ3日分(2026-08-13/14/15)の1時間ごとのデータを
// その場で組み立てる。各日の気温は WEATHER_MOCK の最高気温に寄せ、
// 正午をピークにした山型にする。降水確率と天気コードは
// telop(晴れ/曇時々雨/曇り)に対応させている。
const HOURLY_DAYS = ['2026-08-13', '2026-08-14', '2026-08-15'];
const HOURLY_PEAK_TEMPERATURE_BY_DAY = [25, 29, 28];
const HOURLY_PRECIPITATION_PROBABILITY_BY_DAY = [10, 60, 30];
const HOURLY_WEATHERCODE_BY_DAY = [0, 61, 3];

const OPEN_METEO_TIMES: string[] = [];
const OPEN_METEO_TEMPERATURES: number[] = [];
const OPEN_METEO_PRECIPITATION_PROBABILITIES: number[] = [];
const OPEN_METEO_WEATHERCODES: number[] = [];

HOURLY_DAYS.forEach((day, dayIndex) => {
  for (let hour = 0; hour < 24; hour++) {
    const distanceFromNoon = Math.abs(hour - 12);
    OPEN_METEO_TIMES.push(`${day}T${String(hour).padStart(2, '0')}:00`);
    OPEN_METEO_TEMPERATURES.push(HOURLY_PEAK_TEMPERATURE_BY_DAY[dayIndex] - distanceFromNoon * 0.3);
    OPEN_METEO_PRECIPITATION_PROBABILITIES.push(HOURLY_PRECIPITATION_PROBABILITY_BY_DAY[dayIndex]);
    OPEN_METEO_WEATHERCODES.push(HOURLY_WEATHERCODE_BY_DAY[dayIndex]);
  }
});

export const OPEN_METEO_MOCK = {
  hourly: {
    time: OPEN_METEO_TIMES,
    temperature_2m: OPEN_METEO_TEMPERATURES,
    precipitation_probability: OPEN_METEO_PRECIPITATION_PROBABILITIES,
    weathercode: OPEN_METEO_WEATHERCODES,
  },
};
```

- [ ] **Step 2: `dashboard.spec.ts` の `beforeEach` でOpen-Meteoもモックする**

`e2e/dashboard.spec.ts` の先頭のimportとbeforeEachを変更:

```ts
import { test, expect } from '@playwright/test';
import {
  WEATHER_API_URL_PATTERN,
  WEATHER_MOCK,
  OPEN_METEO_API_URL_PATTERN,
  OPEN_METEO_MOCK,
} from './fixtures/weather-mock';

test.beforeEach(async ({ page }) => {
  await page.route(WEATHER_API_URL_PATTERN, (route) => route.fulfill({ json: WEATHER_MOCK }));
  await page.route(OPEN_METEO_API_URL_PATTERN, (route) => route.fulfill({ json: OPEN_METEO_MOCK }));

  // TimeContextはマウント直後にnew Date()で時刻を確定するため、
  // goto()より前に固定時刻をセットしておく必要がある。
  // 2026-08-13は木曜日、翌日8/14は第2金曜日(木の枝・草・葉の収集日)。
  await page.clock.setFixedTime(new Date('2026-08-13T22:31:33+09:00'));
});
```

- [ ] **Step 3: weatherモードのテストに時間帯別表示の検証を追加する**

`e2e/dashboard.spec.ts` の「モード切り替え」テスト内、`weather` の検証部分を変更:

```ts
    await advanceMode();
    // weather: 服装指数・ゴミ出しの見出しは消え、3日分の時間帯別天気が全画面表示される
    await expect(page.getByText('きょうの服装')).not.toBeVisible();
    await expect(page.getByText('あすのゴミ')).not.toBeVisible();
    await expect(page.getByText('今日', { exact: true })).toBeVisible();
    await expect(page.getByText('明後日', { exact: true })).toBeVisible();
    // Open-Meteoモックの降水確率(2026-08-14, 60%)が表形式で見える
    await expect(page.getByText('60%').first()).toBeVisible();
```

- [ ] **Step 4: E2Eテストを実行する**

Run: `pnpm exec playwright install chromium`(未インストールの場合のみ)
Run: `pnpm run test:e2e`
Expected: PASS(全テスト)

- [ ] **Step 5: コミット**

```bash
git add e2e/fixtures/weather-mock.ts e2e/dashboard.spec.ts
git commit -m "test: weatherモードのE2EでOpen-Meteoレスポンスもモックする"
```

---

### Task 8: CLAUDE.mdのドキュメント更新

**Files:**
- Modify: `CLAUDE.md`(「データソース」節)

**Interfaces:**
- Consumes: なし
- Produces: なし(ドキュメントのみ)

- [ ] **Step 1: 「データソース」節に追記する**

`CLAUDE.md` の以下の行:

```markdown
### データソース

天気は `https://weather.tsukumijima.net/api/forecast/city/120010`（千葉市、API キー不要）。都市を変える場合は `WeatherContext.tsx` の `CHIBA_CITY_ID` を変更する。
```

を、以下に変更:

```markdown
### データソース

天気(今日・明日・明後日の概要、defaultモード下段と`Weather.tsx`)は `https://weather.tsukumijima.net/api/forecast/city/120010`（千葉市、API キー不要）。都市を変える場合は `WeatherContext.tsx` の `CHIBA_CITY_ID` を変更する。

`weather`モード(全画面、`WeatherDetail.tsx`)の時間帯別データは [Open-Meteo](https://api.open-meteo.com/v1/forecast) から取得する。こちらもAPIキー不要だが、都市の指定が緯度経度(`HourlyWeatherContext.tsx` の `CHIBA_LATITUDE` / `CHIBA_LONGITUDE`)である点がtsukumijimaの `CHIBA_CITY_ID` と異なる。都市を変える場合は両方の変更が必要。
```

- [ ] **Step 2: コミット**

```bash
git add CLAUDE.md
git commit -m "docs: weatherモードのデータソース(Open-Meteo)をCLAUDE.mdに追記する"
```

---

### Task 9: 動作確認

**Files:** なし(確認のみ)

- [ ] **Step 1: 開発サーバーを起動する**

Run: `pnpm run dev`

- [ ] **Step 2: Playwright MCPで確認する**

CLAUDE.mdの「動作確認」手順に従う:

1. `browser_navigate` で `http://localhost:3000` を開く
2. `browser_resize` で 1920x1080 にする
3. クリックで `weather` モードまで進める
4. `browser_take_screenshot` で、今日/明日/明後日が3段の表形式(時刻・アイコン・気温グラフ・降水確率)で崩れずに表示されていることを確認する。特に今日の段がやや大きく、8列とも画面内に収まって(横スクロールが発生せず)いることを確認する
5. `browser_console_messages` でコンソールエラーがないことを確認する(Open-Meteoへの実際のfetchが成功していること)

- [ ] **Step 3: 問題があれば修正し、Step 2をやり直す**

レイアウト崩れやコンソールエラーがあれば該当タスクのコードを修正し、`pnpm run test` と `pnpm run lint` を再実行してから再度確認する。
