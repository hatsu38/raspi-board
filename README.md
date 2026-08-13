# raspi-board

Raspberry Pi に接続した小型ディスプレイで常時表示することを想定した情報ボード。時計・天気予報・服装指数・ゴミ出し予定を 1 画面にまとめて表示する。

## 表示内容

- **時計** — 日付・曜日・時刻（1 秒ごとに更新）
- **天気予報** — 今日から 3 日分の天気・最高/最低気温・時間帯別の降水確率（5 分ごとに更新）
- **服装指数** — 気温・天気・降水確率・風から算出したその日の服装の目安をイラストで表示
- **ゴミ出し** — 明日出すゴミの種類。天気カードにも各日の収集予定を併記

## 表示モード

画面のどこかをクリック / タップするたびに、以下の順で表示が切り替わる。タッチディスプレイで操作することを想定した作り。

```
default（全部表示） → clock → garbage → weather → default …
```

`default` 以外は該当カードを 1 枚だけ拡大して全画面表示する。離れた場所から見るときに使う。

## セットアップ

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

天気の取得には [天気予報 API（livedoor 天気互換）](https://weather.tsukumijima.net/) を使っており **API キーは不要**。環境変数の設定なしでそのまま動作する。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー |
| `npm run lint` | Lint |
| `npm run lint:fix` | Lint（自動修正） |

## カスタマイズ

### 地域を変える

`src/_contexts/WeatherContext.tsx` の `CHIBA_CITY_ID` を対象地域の city ID に変更する。ID は[天気予報 API の対応都市一覧](https://weather.tsukumijima.net/primary_area.xml)から調べられる。

服装指数のフォールバック用平年気温も千葉基準なので、地域を大きく変える場合は `src/_utils/clothingScore.ts` の `MONTHLY_TEMPERATURES` もあわせて調整する。

### ゴミ出しスケジュールを変える

`src/_components/Garbage.tsx` の `garbageSchedule` を自分の自治体の収集日に書き換える。

```ts
{
  name: "可燃",
  days: ["水", "土"],        // 収集曜日
  image: "/garbages/可燃.png",
}
{
  name: "不燃・有害",
  days: ["金"],
  weekNumber: [1, 3],        // 第1・第3金曜のみ
  image: "/garbages/不燃・有害.png",
}
```

アイコンは `public/garbages/` に置き、`image` にパスを指定する。

## 技術スタック

Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / Day.js
