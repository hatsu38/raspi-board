const MINUTE = 60 * 1000;

// 天気は5分ごとに取得するため、3回続けて更新できなければ「最終更新」を表示する
export const STALE_DISPLAY_THRESHOLD = 15 * MINUTE;

// それでも復旧しないまま30分経ったら、ページごと読み込み直して復旧を試みる
export const STALE_RELOAD_THRESHOLD = 30 * MINUTE;

// 最後に天気を取得できた時刻(ミリ秒)から、しきい値以上経っているか
export function isWeatherStale(lastUpdatedAt: number, now: number, threshold: number): boolean {
  return now - lastUpdatedAt >= threshold;
}
