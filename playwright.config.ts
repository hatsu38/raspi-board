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
    command: 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
