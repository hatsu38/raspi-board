# TimeTree予定表示機能 設計書

## 背景・目的

ユーザーはTimeTreeで家族の予定を管理しており、Raspberry Piの情報ボードでもその予定を確認したい。

TimeTreeの公式API(Connect App)は2023年12月22日に終了しており、現存する予定取得手段は非公式(reverse-engineered)のWeb APIのみである。またボードは玄関・キッチンに常時表示され、Vercel上のURLに認証なしでアクセスできる状態のため、TimeTreeの予定という個人情報を表示するにあたり、外部からURLを知られて予定を覗き見られるリスクへの対策も併せて必要になった。

## スコープ

1. TimeTree予定の取得(非公式Web API経由)
2. defaultモードへの直近予定表示
3. 新規専用モード`schedule`での月間カレンダー表示
4. ボード全体への簡易認証の追加

対象カレンダーはユーザーが利用している単一カレンダー(または全カレンダーをまとめたもの)とし、カレンダーごとの絞り込みは行わない。

## 1. データ取得

### 非公式TimeTree Web APIについて

公式APIが終了しているため、OSSの [`timetree-exporter`](https://github.com/eoleedi/TimeTree-Exporter)(Python)を参考に、同等のログイン・データ取得ロジックをTypeScriptで実装する。

- ログイン: `PUT https://timetreeapp.com/api/v1/auth/email/signin` に `{ uid: email, password, uuid: <random> }` をJSON送信、ヘッダー `X-Timetreea: web/2.1.0/en` を付与。レスポンスの `Set-Cookie: _session_id=...` をセッションとして使う。
- 予定取得: 上記セッションCookieを使ってカレンダー・イベント一覧を取得する(具体的なエンドポイントは実装時に`timetree-exporter`の`calendar.py`を参照して詳細化する)。

**既知のリスク**: 非公式かつリバースエンジニアリングされたAPIであるため、TimeTree側の仕様変更で予告なく壊れる可能性がある。利用規約上のグレーゾーンでもあり、頻繁なアクセスはレート制限やアカウント一時停止を招く恐れがある。壊れた場合は再度TimeTree Webの通信を調査し直す必要がある。

### API Route

新規: `src/app/api/timetree/route.ts`

- GETハンドラーで「今日から1ヶ月分の予定」を一括取得し、ブラウザに必要な形式(日付・時刻・タイトル・終日フラグ)に整形して返す。
- direct/専用モードでAPIを分けず、同じレスポンスをクライアント側で用途別(直近5件 / 月間グリッド)に加工する。
- 認証情報はサーバー環境変数 `TIMETREE_EMAIL` / `TIMETREE_PASSWORD`(ユーザーが普段使っているアカウントをそのまま使用。Vercel環境変数はサーバー側でのみ読まれ、クライアントバンドルには含まれない)。
- リクエストのたびに毎回ログインし直すシンプルな実装とする。Vercelのサーバーレス関数は実行環境がリクエストごとに変わりうるため、セッションを使い回すキャッシュは信頼できない。5分に1回程度のログイン頻度であれば通常はTimeTree側のレート制限に抵触しない想定。
- 取得・ログインに失敗した場合は5xxエラーを返す。

### Context

新規: `src/_contexts/ScheduleContext.tsx`

既存の[`WeatherContext.tsx`](../../../src/_contexts/WeatherContext.tsx)と同じパターンを踏襲する。

- マウント時に`fetch('/api/timetree')`し、以後5分ごとに再取得する。
- 取得に失敗した場合は直前のデータを保持し続け、画面を崩さない。

## 2. UI変更

### defaultモード([Dashboard.tsx](../../../src/_components/Dashboard.tsx))

現状、下段は「今日・明日・明後日」の天気カード3枚(`grid-cols-[1.5fr_1fr_1fr]`)。これを次のように変更する。

- 明後日の天気カードを削除する(見る機会が少ないため)。
- 下段を「今日の天気(小さめ)・明日の天気(小さめ)・直近の予定(広め)」の3列構成に変更する。
- 予定欄は直近5件を「時刻+タイトル」形式で表示する(終日予定は時刻を表示しない)。
- 予定欄の文字サイズは、[globals.test.ts](../../../src/app/globals.test.ts)が定義する「1mから一瞬で読める」基準(日本語で最低6.5vh相当、`.fs-today-telop`と同水準)を満たす大きさにする。この基準を満たすクラスを新設するか既存クラスを流用するかは実装時に決める。

### 新規専用モード `schedule`

- [`DisplayModeContext.tsx`](../../../src/_contexts/DisplayModeContext.tsx)の`DISPLAY_MODES`に`'schedule'`を追加し、巡回順を`default → weather → schedule → clock → garbage`とする。
- 新規コンポーネント`Schedule.tsx`(命名は`WeatherDetail.tsx`に倣う)を作成し、`Dashboard.tsx`の`renderContent`に`case 'schedule':`を追加する。
- レイアウトは月間カレンダーグリッド形式(曜日7列 × 5〜6週)。
- この画面は「気になったら近づいてじっくり見る」前提のため、5mm基準の対象外とし、既存の近距離用クラス(`fs-2xs`〜`fs-sm`程度)を使う。
- 1マスには最大1〜2件の予定タイトルを表示し、それ以上は「+N件」の省略表示にする(1マスの幅が7列分割で限られるため)。

## 3. 認証(ボード全体の保護)

### 背景

ボードのVercel URLが外部に知られた場合、誰でもインターネット経由で個人の予定を閲覧できてしまう。Vercelは無料(Hobby)プランのため、公式のデプロイパスワード保護機能は使えない。

### 実装方針

新規: `src/middleware.ts`

- 環境変数`BOARD_ACCESS_TOKEN`に、`openssl rand -hex 16`等で生成した推測不可能な文字列を設定する。
- 判定ロジック:
  1. リクエストのCookieに有効なトークンがあれば通過。
  2. Cookieがなくてもクエリパラメータ`?key=`がトークンと一致すれば、Cookieを発行して通過。
  3. どちらもなければ401を返す。
- 適用範囲はページ・API Route(`/api/timetree`を含む)全体。
- Cookieの有効期限は長め(例: 1年)にするが、**Cookieの永続性には依存しない設計**とする。Piのkiosk起動URL自体に常に`?key=`を含めておく(例: `https://xxx.vercel.app/?key=<token>`)ことで、Cookieが消えてもPiの起動・再起動のたびに自動的に再認証される。Cookieはページ内の`fetch`がURLパラメータなしで認証を通すための補助的な仕組みに過ぎない。
- Pi側のkiosk起動設定(systemd/autostart等)のURLをトークン付きに変更するのはユーザー側の作業であり、このリポジトリの変更範囲には含まない。

## 4. エラーハンドリング

- TimeTreeログイン失敗・非公式API仕様変更時: API Routeがエラーを返し、クライアントは直前に取得できた予定を表示し続ける(既存の`WeatherContext`と同じフォールバック方針)。
- 終日予定は時刻表示なし、時間指定の予定のみ時刻を表示する。

## 5. テスト方針

プロジェクトの既存方針([CLAUDE.md](../../../CLAUDE.md))を踏襲する。

- 純粋関数(予定の整形・フィルタリング・月間グリッド生成ロジックなど)を優先してテストする。
- 日付やAPIレスポンスに依存するテストは、最小限のモックオブジェクトを都度組み立てる。
- TimeTreeへの実際のログイン処理自体は外部サービス依存のため、ユニットテストではモックし、実際の疎通確認はPlaywright MCPでの目視確認で行う。

## 既知のリスク・今後の課題

- TimeTree非公式APIはいつ壊れてもおかしくない。壊れた場合は再度リバースエンジニアリングが必要になる。
- 認証情報(メール・パスワード)を長期間Vercel環境変数に保持することそのもののアカウントセキュリティ上のリスクは残る。
- レート制限に引っかかった場合の具体的な挙動(リトライ間隔など)は実装時に調整する。
