// 応答しないリクエストを打ち切るまでの時間。5分ごとの定期取得より十分短くする
const FETCH_TIMEOUT = 30 * 1000;

// 定期取得用のfetch。キオスク表示はページを開いたまま何日も動き続けるため、
// - ブラウザのHTTPキャッシュを経由せず、毎回サーバーから最新値を読む
// - 通信が応答しないまま止まったリクエストは、タイムアウトで失敗として扱う
// の2点を、外部APIを読む箇所で揃える。
export function fetchFresh(url: string): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
}
