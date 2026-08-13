import { test, expect } from '@playwright/test';
import { WEATHER_API_URL_PATTERN, WEATHER_MOCK } from './fixtures/weather-mock';

test.beforeEach(async ({ page }) => {
  await page.route(WEATHER_API_URL_PATTERN, (route) => route.fulfill({ json: WEATHER_MOCK }));

  // TimeContextはマウント直後にnew Date()で時刻を確定するため、
  // goto()より前に固定時刻をセットしておく必要がある。
  // 2026-08-13は木曜日、翌日8/14は第2金曜日(木の枝・草・葉の収集日)。
  await page.clock.setFixedTime(new Date('2026-08-13T22:31:33+09:00'));
});

test.describe('デフォルト画面', () => {
  test('時計・天気・服装指数・翌日のゴミ出しが表示される', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('2026/08/13(木)')).toBeVisible();
    await expect(page.getByText('22:31')).toBeVisible();

    // モックの気温(最高/最低とも25℃・晴れ)から計算される服装指数
    await expect(page.getByText('半袖Tシャツ一枚で過ごせる暑さ')).toBeVisible();

    // Garbageコンポーネントは渡された日付の「翌日」を表示する。
    // 今日(8/13木)自身は収集日を持たないが、翌日(8/14金)は
    // 第2金曜日にあたり木の枝・草・葉の収集日になる。
    // (収集ルール文字列「金曜日・第2・4週」はGarbageコンポーネント固有の
    //  表示のため、Weather側の同名バッジと重複せず一意に特定できる)
    await expect(page.getByText('あすのゴミ')).toBeVisible();
    await expect(page.getByText('金曜日・第2・4週')).toBeVisible();

    // 3日分の天気予報(今日/明日/明後日)
    await expect(page.getByText('今日', { exact: true })).toBeVisible();
    await expect(page.getByText('明日', { exact: true })).toBeVisible();
    await expect(page.getByText('明後日', { exact: true })).toBeVisible();
    await expect(page.getByText('曇時々雨')).toBeVisible();
  });
});

test.describe('モード切り替え', () => {
  test('クリックのたびにdefault→clock→garbage→weather→defaultの順で巡回する', async ({ page }) => {
    await page.goto('/');

    // default: 服装指数カードの見出しが見える
    await expect(page.getByText('きょうの服装')).toBeVisible();

    // クリックで画面全体のモードを進める(page.tsxのルート要素のonClickに依存)
    const advanceMode = () => page.mouse.click(960, 540);

    await advanceMode();
    // clock: 服装指数・ゴミ出しの見出しはどちらも消え、時計だけの全画面表示になる
    await expect(page.getByText('きょうの服装')).not.toBeVisible();
    await expect(page.getByText('あすのゴミ')).not.toBeVisible();
    await expect(page.getByText('22:31')).toBeVisible();

    await advanceMode();
    // garbage: ゴミ出しの見出しだけが全画面表示される
    await expect(page.getByText('あすのゴミ')).toBeVisible();
    await expect(page.getByText('きょうの服装')).not.toBeVisible();

    await advanceMode();
    // weather: 服装指数・ゴミ出しの見出しは消え、3日分の天気が全画面表示される
    await expect(page.getByText('きょうの服装')).not.toBeVisible();
    await expect(page.getByText('あすのゴミ')).not.toBeVisible();
    await expect(page.getByText('今日', { exact: true })).toBeVisible();
    await expect(page.getByText('明後日', { exact: true })).toBeVisible();

    await advanceMode();
    // 4回目のクリックでdefaultに戻る
    await expect(page.getByText('きょうの服装')).toBeVisible();
  });
});
