# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Raspberry Pi に接続した小型ディスプレイで常時表示することを想定した情報ボード。時計・千葉市の天気予報・服装指数・ゴミ出し予定を 1 画面に表示する。Next.js 15 (App Router) / React 19 / Tailwind CSS v4 / TypeScript。

## コマンド

```bash
pnpm install         # 依存インストール
pnpm run dev         # 開発サーバー (Turbopack, http://localhost:3000)
pnpm run build       # 本番ビルド
pnpm run start       # 本番サーバー
pnpm run lint        # eslint .
pnpm run lint:fix    # eslint . --fix
pnpm run test        # Jest (ユニット・コンポーネントテスト)
pnpm run test:watch  # Jest watch モード
pnpm run test:e2e    # Playwright E2E テスト(e2e/配下、本番ビルドに対して実行)
```

パッケージマネージャは pnpm(`packageManager` フィールドで固定)。npm/yarn は使わない。`pnpm-lock.yaml` のみをコミットし、`package-lock.json` / `yarn.lock` は作らない。

### テスト

ユニット・コンポーネントテストは Jest + React Testing Library（`next/jest` 経由でセットアップ、`jest.config.ts`）。テストファイルは対象と同じディレクトリに `*.test.ts(x)` として置く。純粋関数（`clothingScore.ts` など）を優先してテストし、日付や API レスポンスに依存するテストは `Forecast` などの最小限のモックオブジェクトを都度組み立てる（既存のモックを使い回して意図を薄めない）。

E2Eテストは `@playwright/test`（`playwright.config.ts`、テストは `e2e/*.spec.ts`）。`webServer` 設定により `pnpm run build && pnpm run start` で起動した本番ビルドに対して実行する（devサーバーではなく本番相当で検証するため）。天気APIは `e2e/fixtures/weather-mock.ts` で `page.route()` により固定レスポンスを返すようモックし、外部APIの実データに依存しないようにしている。日付・時刻も `page.clock.setFixedTime()` で固定してから `page.goto()` する（`TimeContext` はマウント時に `new Date()` を読むため、`goto()` より前に固定する必要がある）。

**Playwright MCP(`.mcp.json`)と `@playwright/test` は別物**。前者は開発中にブラウザを対話的に操作して目視確認するためのツール、後者は自動テストスイート。動作確認の手順(下記)はMCPを、回帰テストの追加は `@playwright/test`(`e2e/`配下)を使う。

## 動作確認

UI の動作確認には Playwright MCP(ルートの `.mcp.json` で定義)を使うこと。`pnpm run dev` で dev サーバーを起動した上で:

1. `browser_navigate` で `http://localhost:3000` を開く
2. `browser_resize` で 1920x1080 にして 7 インチディスプレイ相当の表示を確認する
3. クリックで 4 モード(default → clock → garbage → weather)を巡回し、`browser_take_screenshot` で各モードのレイアウト崩れがないか確認する
4. `browser_console_messages` でコンソールエラーがないことを確認する

Playwright のブラウザが未インストールの場合は `pnpm exec playwright install chromium` を先に実行する。

## アーキテクチャ

### レンダリング構成

全コンポーネントが `'use client'`。サーバーコンポーネント/Route Handler/API Routes は一切使っていない。データ取得はすべてブラウザ側の `fetch` で行う。

`src/app/page.tsx` が 3 つの Provider をネストし、その内側の `Dashboard` が表示を組み立てる:

```
TimeProvider → WeatherProvider → DisplayModeProvider → MainContent → Dashboard
```

### 3 つの Context (`src/_contexts/`)

| Context | 責務 |
| --- | --- |
| `TimeContext` | 1 秒ごとに `dayjs()` を更新して配信。時計表示と全日付計算の起点 |
| `WeatherContext` | 5 分ごとに天気 API を fetch。取得と同時に服装指数も計算して保持 |
| `DisplayModeContext` | 表示モードを `default → clock → garbage → weather` の順に巡回 |

モード切り替えは画面全体の `onClick`（`page.tsx` のルート div）に紐づいている。タッチディスプレイで画面のどこを触ってもモードが進む設計。`default` 以外はカード 1 枚を全画面表示し、拡大は CSS 変数 `--scale` で行う（`Dashboard.tsx` の `fullscreenStyle`）。現在のモードは画面下部のドットインジケーターで示す。

### デプロイの自動反映 (`src/_hooks/useReloadOnNewDeploy.ts`)

キオスク表示はページを開いたまま放置され、全画面（`--kiosk`）ではリロード操作もできないため、デプロイしてもブラウザが古いページを掴んだままになる。これを避けるため、`page.tsx` の `Home` が `useReloadOnNewDeploy` を呼び、5 分ごとに `/version.json` を `cache: 'no-store'` で読んで、起動時に読んだ値から変わっていたら `location.reload()` する。

`public/version.json` は `prebuild` / `predev` フックで `scripts/generate-version.mjs` が生成する（`.gitignore` 済み）。比較に使うのは `builtAt`（ビルド時刻）で、コミット SHA ではない。同じコミットを再デプロイしても値が変わるようにするため。同ファイルの `commit` は「いま画面に出ているのはどのコミットか」を人が確認するための付加情報で、判定には使わない。

取得に失敗した回（dev サーバーで未生成、一時的な通信失敗）は判定を次回に見送る。誤リロードを避けるため、`null` を「変化」として扱わない。

リロードの副作用は `src/_libs/reloadPage.ts` に切り出してある。jsdom では `window.location` を差し替えられず、テストから `reload` をモックできないため。

### レイアウトとタイポグラフィ

7 インチ 1920x1080 の横長ディスプレイにスクロールなしでフィットさせるため、文字サイズはすべて `vh` 基準の独自クラス（`globals.css` の `.fs-2xs`〜`.fs-clock`）で指定する。各クラスは `calc(NvH * var(--scale, 1))` の形で、全画面モードでは親要素の `--scale` を変えるだけで一括拡大できる。画像サイズなど個別の寸法も `h-[calc(8vh*var(--scale,1))]` のように同じ変数を参照する。Tailwind の `text-*` サイズクラスは使わない。

タッチディスプレイでの誤操作（長押しのテキスト選択・コンテキストメニュー・ピンチズーム → 仮想キーボードや選択ツールバーの出現要因）は、`globals.css` の `user-select: none` / `touch-action: manipulation`、`page.tsx` の `onContextMenu` 抑止、`layout.tsx` の `viewport`（`userScalable: false`）で防いでいる。

### データソース

天気(今日・明日・明後日の概要、defaultモード下段と`Weather.tsx`)は `https://weather.tsukumijima.net/api/forecast/city/120010`（千葉市、API キー不要）。都市を変える場合は `WeatherContext.tsx` の `CHIBA_CITY_ID` を変更する。

`weather`モード(全画面、`WeatherDetail.tsx`)の時間帯別データは [Open-Meteo](https://api.open-meteo.com/v1/forecast) から取得する。こちらもAPIキー不要だが、都市の指定が緯度経度(`HourlyWeatherContext.tsx` の `CHIBA_LATITUDE` / `CHIBA_LONGITUDE`)である点がtsukumijimaの `CHIBA_CITY_ID` と異なる。都市を変える場合は両方の変更が必要。

### 服装指数 (`src/_utils/clothingScore.ts`)

日中の活動時間帯に近い体感になるよう、最高気温 65% / 最低気温 35% の加重平均（`getFeelsLikeTemperature`）を基礎温度とする。この温度から `TEMPERATURE_SCORE_ANCHORS`（気温とスコアのアンカー点）を線形補間してベーススコアを出し、降水確率（06-12/12-18 のうち高い方）・天気 telop・波高/風向きの補正を加えて 0〜100 に clamp する。段階的な閾値ではなくアンカー間の線形補間にしているのは、近い気温同士（例: 21℃と24℃）でも指数が滑らかに変化するようにするため。`MONTHLY_TEMPERATURES` は API が気温を返さないとき（当日以外の予報でよくある）のフォールバック値で、千葉の平年値。

スコアは 10 刻みの閾値で `public/clothes/<閾値>.png` の画像に対応する。文言は `CLOTHING_DESCRIPTIONS` のみで管理しており、画像ファイル名とは独立している。

### ゴミ出しスケジュール (`src/_components/Garbage.tsx`)

作者の自治体の収集日を `garbageSchedule` にハードコードしている。`days` は曜日（`ddd` の日本語 1 文字）、`weekNumber` があれば第 N 週のみ。週番号は `Math.ceil(date.date() / 7)` で算出する単純な日付ベース判定。

判定関数 `getGarbageTypes` はコンポーネントと同じファイルから export され、`Weather.tsx` からも import されている。ゴミ関連のロジックを触るときはこの依存に注意。

表示対象の日付が 2 箇所で異なる点に注意:
- `Garbage` コンポーネント: 引数の日付 **+1 日**（「明日のゴミ出し」）
- `Weather` の各カード内: そのカードの日付そのもの

### dayjs (`src/_libs/dayjsJa.ts`)

dayjs は必ずこのモジュール経由で import する。ja ロケールと `weekday` / `isBetween` / `isSameOrAfter` / `isSameOrBefore` プラグインを登録済み。ゴミ出し判定は `format('ddd')` が「月」「火」を返す ja ロケール前提なので、素の `dayjs` を直接使うと壊れる。

### ディレクトリ規約

`src/_components/` `src/_contexts/` `src/_hooks/` `src/_utils/` `src/_libs/` `src/types/`。`_` 接頭辞は App Router のルーティング対象から外すため（private folder 規約）。パスエイリアスは `@/*` → `./src/*` だが、現状のコードは相対パス import で統一されている。

## 既知の注意点

- **`public/` の画像ファイル名は ASCII のみにする**: macOS は濁点・半濁点かなを NFD(分解形)でファイルシステムに保存するため、日本語ファイル名はブラウザの NFC リクエストと一致せず、本番サーバー(`next start`)で 404 になる(dev サーバーでは正規化されて動くため気づきにくい)。
- **next/image は最適化オフ**: ローカル配信のキオスク用途のため `next.config.ts` で `images.unoptimized: true` にしている。これにより API が返す `https://www.jma.go.jp/...` の天気アイコンも `remotePatterns` なしで表示できる。最適化を有効に戻す場合は jma.go.jp の `remotePatterns` 追加が必要。最適化オフのため、`public/clothes/` `public/garbages/` の画像は事前に長辺 500px 程度にリサイズ・pngquant で圧縮済み(実際の表示サイズは最大でも 350px 角程度)。新しい画像を追加する場合も同様に事前圧縮してから配置すること。
- **未使用の設定と依存**: `.env` の `OPEN_WEATHER_API_KEY` / `EKISPART_API_KEY` / `YAHOO_API_KEY` と `next.config.ts` の `env` 宣言は、現状 `src/` のどこからも参照されていない。`axios` も同様に未使用（fetch を直接使用）。
- **`next.config.ts` の `env` はクライアントバンドルに埋め込まれる**。ここに実際の秘密鍵を通すと公開されるため、サーバー側でのみ使う値をここに追加してはいけない。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
