const VERSION_URL = '/version.json';

// scripts/generate-version.mjs が書き出したビルド識別子を読む。
// 取得できなかった場合(devサーバーで未生成、一時的な通信失敗など)は null を返す。
export async function fetchBuiltAt(): Promise<string | null> {
  try {
    // ブラウザとCDNのどちらのキャッシュも経由せず、常にデプロイ済みの最新値を読む
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const data: { builtAt?: unknown } = await response.json();
    return typeof data.builtAt === 'string' ? data.builtAt : null;
  } catch {
    return null;
  }
}
