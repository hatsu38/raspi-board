# 天気予報詳細画面(weatherモード)の時間帯別表示 設計

## 背景・目的

`weather` モード(4モード巡回のうちの1つ、全画面表示)は現在、トップページ下段と同じ `Weather` コンポーネントをそのまま拡大表示しているだけで、今日・明日・明後日の概要(telop・最高最低気温・6時間帯の降水確率)しか出ていない。せっかく全画面を使えるので、`weather` モードでは今日は1時間ごと、明日・明後日はより細かい時間帯別の天気を見られるようにする。

トップページ(defaultモード)下段の `Weather` コンポーネントの表示内容は変更しない。

## 制約・前提

- 表示ハードウェアは1920x1080の横長ディスプレイで、**横スクロールができない**。1画面に収まる列数しか出せない。
- 現在使用している天気API(`https://weather.tsukumijima.net/api/forecast/city/120010`)は日ごとの最高/最低気温と6時間帯(`T00_06`など)の降水確率しか持たず、**時間帯別の気温・降水確率・天気コードは提供していない**。この用途には別のデータソースが必要。
- ブレスト時に検証済み: [Open-Meteo](https://api.open-meteo.com/v1/forecast) はAPIキー不要・無料で、緯度経度指定により1時間ごとの `temperature_2m` / `precipitation_probability` / `weathercode`(WMO天気コード) を返す。`forecast_days=3` と `timezone=Asia/Tokyo` を指定すると、今日00:00始まりで3日分・計72時間分がローカル時刻の配列で返る。

## レイアウト方針(ユーザー承認済み)

`weather` モードの中身を、tenki.jpの「1時間天気」表に近い表形式に置き換える。

- 今日・明日・明後日を **縦に3段** 積む(横3列ではない)。今日の段をやや大きく(`flex: 1.5`)、明日・明後日は同じ大きさ(`flex: 1`)。
- 各段の間隔は **3時間おき・8列で統一**(今日・明日・明後日とも同じ間隔)。実装をシンプルにするため、今日だけ間隔を変える案は採用しない。
- 各段の構成(上から下):
  1. 日付見出し(「今日」「明日」「明後日」バッジ + `M/D(ddd)`)
  2. 時刻ラベル行(`0 3 6 9 12 15 18 21`)
  3. 天気アイコン行(各時刻のアイコン)
  4. 気温の折れ線グラフ(SVGのpolylineで、実際の気温を正規化して描く)
  5. 降水確率の数値行(`%`表示)
- 今日の行は0時〜21時の全時間帯を表示する(現在時刻以降だけに絞らない。tenki.jpの表示と同様、当日全体の予報として見せる)。
- 既存の要素(telopの大きい文字、最高/最低気温の大きい数字、ゴミ出しバッジ)は **廃止**(ゴミ出しは別途 `garbage` モードがあるため重複を許容する)。

## アーキテクチャ

### 新規: `HourlyWeatherContext`

`src/_contexts/HourlyWeatherContext.tsx` を新設し、`WeatherContext.tsx` とは責務を分ける(既存は tsukumijima の日次データ+服装指数の計算という別の関心事を持っており、混ぜ込むとファイルの責務が肥大化するため)。

- Open-Meteo へのfetchを担当。`WEATHER_API_BASE_URL` と同様のパターンで `OPEN_METEO_API_BASE_URL` を定義し、緯度経度定数(`CHIBA_LATITUDE` / `CHIBA_LONGITUDE`)を持つ。
- 既存 `WeatherContext` と同じfetchパターンを踏襲: マウント時fetch + 5分ごと(`REFRESH_INTERVAL`)再取得、再取得中も前回データを表示し続ける(ローディングに戻さない)。
- 公開する値: `hourlyForecast: HourlyForecast[] | null`、`loading: boolean`、`error: string | null`。
- `page.tsx` のProvider入れ子に追加する: `TimeProvider → WeatherProvider → HourlyWeatherProvider → DisplayModeProvider → MainContent`。

### 新規の型 (`src/types/weather.ts` に追加)

```ts
export type HourlyForecast = {
  time: string; // ISO8601 (Asia/Tokyo, 例: "2026-08-23T09:00")
  temperature: number;
  precipitationProbability: number;
  weatherCode: number; // WMO weather code
};
```

### 新規ユーティリティ

- `src/_utils/weatherCode.ts`: `getWeatherIconKindFromCode(code: number): WeatherIconKind`。WMOコード表を既存の8種類(`sunny` / `sunny-cloudy` / `cloudy` / `cloudy-rain` / `rain` / `heavy-rain` / `snow` / `thunder`)にマッピングする。telopベースの `getWeatherIconKind` と異なり、**未知のコードでも `cloudy` にフォールバックして必ず値を返す**(WMOコードは既知の有限集合のため、null を返す必要がない)。
- `src/_utils/hourlyForecastGrouping.ts`: `groupHourlyForecastByDay(hourly: HourlyForecast[], dates: Dayjs[], intervalHours = 3): HourlyForecast[][]`。`dates` の各日について、`time` の日付部分(`YYYY-MM-DD`)が一致する要素だけを取り出し、時刻が3の倍数(0, 3, 6, ..., 21)のものだけを抽出して返す純粋関数。

### `WeatherIcon` のリファクタ

現在 `WeatherIcon` は内部で `getWeatherIconKind(telop)` を呼んで種類を決めている。これを `kind: WeatherIconKind | null` を直接受け取る形に変更し、telopからの変換は呼び出し側に移す。

- 変更前: `<WeatherIcon telop={forecast.telop} fallbackUrl={forecast.image?.url} />`
- 変更後: `<WeatherIcon kind={getWeatherIconKind(forecast.telop)} fallbackUrl={forecast.image?.url} />`(`Weather.tsx` 側で変換)
- 新しい呼び出し元(`WeatherDetail.tsx`)は `getWeatherIconKindFromCode(hourly.weatherCode)` の結果を渡す。

呼び出し箇所は現在1つだけ(`Weather.tsx`)なので、影響範囲は小さい。

### 新規コンポーネント: `WeatherDetail.tsx`

`src/_components/WeatherDetail.tsx` を新設。`Dashboard.tsx` の `'weather'` ケースだけ `<Weather dates={dates} />` から `<WeatherDetail dates={dates} />` に差し替える(defaultモード下段の `<Weather dates={dates} />` はそのまま)。

- `useHourlyWeather()` から生データを取得し、`groupHourlyForecastByDay()` で3日分×8点に加工する。
- 日ごとの1段を表す内部コンポーネント(例: `DayHourlyTable`)を today/明日/明後日で3回描画。today には強調用のpropを渡す。
- 気温グラフはさらに `TemperatureGraph`(SVG, 8点の気温配列を受け取り正規化してpolylineを描く)として切り出す。
- ローディング・エラー時は既存 `Weather.tsx` と同様のパターン(前回データがあれば表示継続、無ければスピナー/エラーメッセージ)。tsukumijima側の状態とは独立に扱う(`HourlyWeatherContext` 由来のローディング/エラーのみを見る)。

## テスト方針

- **単体テスト**(純粋関数を優先する既存方針に沿う):
  - `weatherCode.test.ts`: 代表的なWMOコード(0=晴れ, 61=弱い雨, 95=雷雨など)が期待する `WeatherIconKind` になること、未知コードで `cloudy` にフォールバックすること。
  - `hourlyForecastGrouping.test.ts`: 3日分の合成データ(既存モックを流用せず、テストごとに最小限のオブジェクトを組み立てる)を渡し、各日8点が正しい時刻・日付で抽出されることを確認する。
- **コンポーネントテスト**: `WeatherDetail.test.tsx` で、3日分の見出しが描画されること、ローディング/エラー状態がクラッシュしないことを確認する最小限のテスト。
- **E2E**: `e2e/fixtures/weather-mock.ts` に Open-Meteo エンドポイントの `page.route()` モックを追加し、既存のtsukumijimaモックと同様に固定レスポンスを返すようにする(本番ビルド相当のE2Eが実際のインターネットに依存しないようにするため)。

## ドキュメント更新

`CLAUDE.md` の「データソース」節に、Open-Meteo を2つ目のデータソースとして追記する。都市を変更する場合はtsukumijimaの `CHIBA_CITY_ID` に加えて Open-Meteo 用の緯度経度(`CHIBA_LATITUDE` / `CHIBA_LONGITUDE`)も変更が必要である旨を明記する。

## スコープ外

- defaultモード(トップページ)下段の `Weather` コンポーネントの表示内容変更
- 時間帯の粒度を日によって変える案(今日2時間おき・明日以降4時間おきなど) — 実装の単純さを優先し不採用
- 天気アイコンの昼/夜バリエーション(既存 `WeatherIconKind` に夜用の種類がなく、今回のスコープでは追加しない)
- モード巡回の挙動そのもの(タップで進む一方通行、自動復帰なし)の変更 — これは以前のブレスト(2026-08-14、リポジトリ外のメモに記録)で扱われ現在中断している別テーマであり、本設計では対象外
