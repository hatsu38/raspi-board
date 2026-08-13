'use client';

import { useEffect } from "react";
import { reloadPage } from "../_libs/reloadPage";

const VERSION_URL = '/version.json';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5分

// scripts/generate-version.mjs が書き出したビルド識別子を読む。
// 取得できなかった場合(devサーバーで未生成、一時的な通信失敗など)は null を返す。
async function fetchBuiltAt(): Promise<string | null> {
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

// キオスク表示は一度開いたら操作されないため、新しくデプロイしてもブラウザは
// 古いページを掴んだままになる。全画面(--kiosk)ではリロード操作もできないので、
// アプリ自身が新しいデプロイを検知してリロードする。
export function useReloadOnNewDeploy() {
  useEffect(() => {
    // 起動時に読んだ値を基準とし、そこから変わったときだけリロードする。
    // 保持期間がeffectの生存期間と一致し、再レンダリングをまたぐ必要もないため
    // refではなくクロージャのローカル変数で足りる。
    let knownBuiltAt: string | null = null;

    const reloadIfNewDeploy = async () => {
      const builtAt = await fetchBuiltAt();
      // 取得できなかったときは判定を次回に見送る(誤リロードを避ける)
      if (builtAt === null) {
        return;
      }

      if (knownBuiltAt === null) {
        knownBuiltAt = builtAt;
        return;
      }

      if (knownBuiltAt !== builtAt) {
        reloadPage();
      }
    };

    reloadIfNewDeploy();
    const interval = setInterval(reloadIfNewDeploy, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);
}
