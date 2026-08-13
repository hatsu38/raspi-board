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

## 表示ハードウェア

| 項目 | 値 |
| --- | --- |
| 機種 | [EVICIV 7 インチモバイルモニター](https://www.amazon.co.jp/dp/B08V54V4NN) |
| 画面サイズ | 7 インチ（16:9） |
| 解像度 | 1920 x 1080 |
| リフレッシュレート | 60 Hz |
| 画素密度 | 約 **315 PPI**（幅 6.10 インチ ÷ 1920px） |
| 想定視認距離 | 玄関・キッチンで **1m 前後**、通りがかりに数秒 |

この画面は「小さいのに高精細」で、**CSS の 1px が 0.08mm、1vh が 0.87mm** にしかならない。デスクトップの感覚でデザインすると実機で破綻するため、以下 2 つの制約がある。**どちらも開発機の MacBook Pro では問題なく見えてしまい、目視では気づけない。**

### 1. 文字サイズ

視認距離 1m で快適に読める文字高は約 5mm（掲示物の経験則: 文字高 mm × 200 ≒ 距離）。**1vh = 0.87mm なので 5.7vh 以上が必要**になる。和文は字面が em をほぼ埋めるので font-size ≒ 文字高として見てよい。`globals.css` の `.fs-*` はこれを基準に選ぶ。

### 2. 配色のコントラスト

このクラスのパネルは白に近い領域の階調から先に潰れる。**カード面と背景の明度差（CIE L*）が 8 未満だと、実機では両者が同じ面に見えて画面全体が白一色になる。**

実際に、カード `#fffcf5` と地 `#fbf3e3`（明度差 3.0）の配色で実機が真っ白になる不具合が起きた。WCAG のコントラスト比は明るい色同士の差を過小評価する（この 2 色でも 1.08:1 に潰れて差が読めない）ため、**面の分離は明度差 ΔL\* で判定する**。

この制約は `src/app/globals.test.ts` が `globals.css` を直接読んで検証しており、閾値を割ると `pnpm run test` が落ちる。配色を変えるときはこのテストを通すこと。

## セットアップ

```bash
pnpm install
pnpm run dev
```

http://localhost:3000 を開く。

天気の取得には [天気予報 API（livedoor 天気互換）](https://weather.tsukumijima.net/) を使っており **API キーは不要**。環境変数の設定なしでそのまま動作する。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm run dev` | 開発サーバー（Turbopack） |
| `pnpm run build` | 本番ビルド |
| `pnpm run start` | 本番サーバー |
| `pnpm run lint` | Lint |
| `pnpm run lint:fix` | Lint（自動修正） |

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

## Raspberry Pi 実機でのキオスク自動起動設定

タッチディスプレイでのURL手入力は誤操作しやすいため、電源投入だけでこのアプリが全画面表示されるようにしておく。Raspberry Pi OS Bookworm（Wayland/labwc構成）を前提とする。

### 前提条件

- `raspi-config` で自動ログインを有効化済み（電源投入でデスクトップセッションが自動的に開始する状態）
- Chromiumがインストール済み（Raspberry Pi OS標準でプリインストール）

### 1. SSHでリモート設定できるようにする

`raspi-config` の `Interface Options > SSH` で有効化する。作業用マシンの公開鍵を登録しておくと、以降の作業はパスワード入力なしでリモートから行える。

```bash
ssh-copy-id <ユーザー名>@<Piのホスト名>.local
```

### 2. キオスク自動起動スクリプトを作成

Pi上（SSH経由でも可）で以下を実行する。

```bash
mkdir -p ~/.config/labwc
cat > ~/.config/labwc/autostart << 'EOF'
#!/bin/sh
chromium --noerrdialogs --disable-infobars --kiosk --incognito \
  --disable-session-crashed-bubble --disable-translate \
  --check-for-update-interval=31536000 \
  --app=<デプロイ先のURL> &
EOF
chmod +x ~/.config/labwc/autostart
```

`labwc`（Bookwormのデフォルトコンポジタ）はセッション開始時にこのスクリプトを自動実行する。再起動すればURLを一切入力せずにアプリが全画面表示される。

### 3. 動作確認

```bash
sudo reboot
```

再起動後、アドレスバーなしで対象URLが全画面表示されればOK。

### デプロイした変更の反映

キオスク表示はページを開いたまま放置され、`--kiosk` の全画面ではリロード操作もできない。そのため、デプロイしてもPi側は古いページを掴んだままになる。

これを避けるため、アプリ自身が5分ごとに `/version.json` を読み、ビルドが変わっていたら自分をリロードする。**デプロイ後は最大5分で自動的に反映されるので、Piに触る必要はない。**

`public/version.json` は `npm run build` / `npm run dev` の前に `scripts/generate-version.mjs` が生成する（Git管理外）。いま表示されているのがどのコミットかは、ブラウザで `<デプロイ先のURL>/version.json` を開けば確認できる。

5分待たずに反映したい場合は、SSHで再起動するのが確実。

```bash
ssh <ユーザー名>@<Piのホスト名>.local 'sudo reboot'
```

### セキュリティに関する注意

- **SSHはパスワード認証をオフにする**: 鍵認証の登録が済んだら `/etc/ssh/sshd_config` の `PasswordAuthentication` を `no` にし、`sudo systemctl restart ssh` で反映する。総当たり攻撃のリスクを減らせる
- **SSHをインターネットに公開しない**: ポート22をルーターで外部に公開（ポート開放）しない。外出先からのメンテナンスが必要な場合はVPN（Tailscaleなど）経由にする
- **キオスクは `--incognito` で起動する**: Cookie・閲覧履歴を残さないため、常時表示の共有ディスプレイに個人情報が残らない
- **ホスト名・IPアドレス・ユーザー名などの固有情報をリポジトリに書かない**: 上記コマンド例のプレースホルダーは実際の値に置き換えず、実値は手元のメモなどGit管理外の場所で管理する

## 技術スタック

Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / Day.js
