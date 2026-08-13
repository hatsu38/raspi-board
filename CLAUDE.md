# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Raspberry Pi に接続した小型ディスプレイで常時表示することを想定した情報ボード。時計・千葉市の天気予報・服装指数・ゴミ出し予定を 1 画面に表示する。Next.js 15 (App Router) / React 19 / Tailwind CSS v4 / TypeScript。

## コマンド

```bash
npm run dev        # 開発サーバー (Turbopack, http://localhost:3000)
npm run build      # 本番ビルド
npm run start      # 本番サーバー
npm run lint       # next lint
npm run lint:fix   # eslint --fix (src 配下)
```

テストフレームワークは未導入。テストを追加する場合はまず選定から必要。

## 動作確認

UI の動作確認には Playwright MCP(ルートの `.mcp.json` で定義)を使うこと。`npm run dev` で dev サーバーを起動した上で:

1. `browser_navigate` で `http://localhost:3000` を開く
2. `browser_resize` で 1920x1080 にして 7 インチディスプレイ相当の表示を確認する
3. クリックで 4 モード(default → clock → garbage → weather)を巡回し、`browser_take_screenshot` で各モードのレイアウト崩れがないか確認する
4. `browser_console_messages` でコンソールエラーがないことを確認する

Playwright のブラウザが未インストールの場合は `npx playwright install chromium` を先に実行する。

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

### レイアウトとタイポグラフィ

7 インチ 1920x1080 の横長ディスプレイにスクロールなしでフィットさせるため、文字サイズはすべて `vh` 基準の独自クラス（`globals.css` の `.fs-2xs`〜`.fs-clock`）で指定する。各クラスは `calc(NvH * var(--scale, 1))` の形で、全画面モードでは親要素の `--scale` を変えるだけで一括拡大できる。画像サイズなど個別の寸法も `h-[calc(8vh*var(--scale,1))]` のように同じ変数を参照する。Tailwind の `text-*` サイズクラスは使わない。

タッチディスプレイでの誤操作（長押しのテキスト選択・コンテキストメニュー・ピンチズーム → 仮想キーボードや選択ツールバーの出現要因）は、`globals.css` の `user-select: none` / `touch-action: manipulation`、`page.tsx` の `onContextMenu` 抑止、`layout.tsx` の `viewport`（`userScalable: false`）で防いでいる。

### データソース

天気は `https://weather.tsukumijima.net/api/forecast/city/120010`（千葉市、API キー不要）。都市を変える場合は `WeatherContext.tsx` の `CHIBA_CITY_ID` を変更する。

### 服装指数 (`src/_utils/clothingScore.ts`)

最高/最低気温の平均から基礎スコアを出し、降水確率・天気 telop・波高/風向きの補正を加えて 0〜100 に clamp する。`MONTHLY_TEMPERATURES` は API が気温を返さないとき（当日以外の予報でよくある）のフォールバック値で、千葉の平年値。

スコアは 10 刻みの閾値で `public/clothes/` の画像に対応する。**画像ファイル名が `<閾値>_<文言>.png` という形式で定数と一致している**ため、文言を変えるときは `CLOTHING_DESCRIPTIONS` とファイル名の両方を直す必要がある。

### ゴミ出しスケジュール (`src/_components/Garbage.tsx`)

作者の自治体の収集日を `garbageSchedule` にハードコードしている。`days` は曜日（`ddd` の日本語 1 文字）、`weekNumber` があれば第 N 週のみ。週番号は `Math.ceil(date.date() / 7)` で算出する単純な日付ベース判定。

判定関数 `getGarbageTypes` はコンポーネントと同じファイルから export され、`Weather.tsx` からも import されている。ゴミ関連のロジックを触るときはこの依存に注意。

表示対象の日付が 2 箇所で異なる点に注意:
- `Garbage` コンポーネント: 引数の日付 **+1 日**（「明日のゴミ出し」）
- `Weather` の各カード内: そのカードの日付そのもの

### dayjs (`src/_libs/dayjsJa.ts`)

dayjs は必ずこのモジュール経由で import する。ja ロケールと `weekday` / `isBetween` / `isSameOrAfter` / `isSameOrBefore` プラグインを登録済み。ゴミ出し判定は `format('ddd')` が「月」「火」を返す ja ロケール前提なので、素の `dayjs` を直接使うと壊れる。

### ディレクトリ規約

`src/_components/` `src/_contexts/` `src/_utils/` `src/_libs/` `src/types/`。`_` 接頭辞は App Router のルーティング対象から外すため（private folder 規約）。パスエイリアスは `@/*` → `./src/*` だが、現状のコードは相対パス import で統一されている。

## 既知の注意点

- **next/image は最適化オフ**: ローカル配信のキオスク用途のため `next.config.ts` で `images.unoptimized: true` にしている。これにより API が返す `https://www.jma.go.jp/...` の天気アイコンも `remotePatterns` なしで表示できる。最適化を有効に戻す場合は jma.go.jp の `remotePatterns` 追加が必要。
- **未使用の設定と依存**: `.env` の `OPEN_WEATHER_API_KEY` / `EKISPART_API_KEY` / `YAHOO_API_KEY` と `next.config.ts` の `env` 宣言は、現状 `src/` のどこからも参照されていない。`axios` も同様に未使用（fetch を直接使用）。
- **`next.config.ts` の `env` はクライアントバンドルに埋め込まれる**。ここに実際の秘密鍵を通すと公開されるため、サーバー側でのみ使う値をここに追加してはいけない。
