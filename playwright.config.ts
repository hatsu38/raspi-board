import { defineConfig, devices } from '@playwright/test';

// ローカルでは reuseExistingServer が有効なため、3000番を別プロジェクトが
// 使っているとそのサーバーに対してテストしてしまう。PORT=3100 のように
// 指定して衝突を避けられるようにする(next start も同じ環境変数を読む)。
const port = process.env.PORT ?? '3000';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // 時計・日付表示はdayjsがブラウザのローカルタイムゾーンで整形するため、
    // CI(UTC)とローカル(JST)で結果が変わらないよう明示的に固定する
    // (このアプリは千葉市向けの常時表示ボードで、JST表示が前提のため)
    timezoneId: 'Asia/Tokyo',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // 実際の.envに開発者がBOARD_ACCESS_TOKEN/TIMETREE_EMAIL/TIMETREE_PASSWORDを
    // 設定していても、E2Eの本番ビルドがそれを読んで(1)未認証で401になったり
    // (2)実際のTimeTreeログインを叩いたりしないよう、ここで明示的に空にする。
    // BOARD_ACCESS_TOKENを空にすると本来は(src/proxy.tsの)フェイルクローズで
    // 逆に401になってしまうため、SKIP_BOARD_AUTH_FAILCLOSEでその判定だけを無効化する
    // (NODE_ENVは'production'のまま変えない。next startの他の挙動に副作用を
    // 及ぼさないようにするため)。
    env: {
      BOARD_ACCESS_TOKEN: '',
      TIMETREE_EMAIL: '',
      TIMETREE_PASSWORD: '',
      SKIP_BOARD_AUTH_FAILCLOSE: 'true',
    },
  },
});
