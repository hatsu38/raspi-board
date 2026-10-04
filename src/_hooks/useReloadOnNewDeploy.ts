'use client';

import { useEffect } from "react";
import { reloadPage } from "../_libs/reloadPage";
import { fetchBuiltAt } from "../_libs/fetchBuiltAt";

const CHECK_INTERVAL = 5 * 60 * 1000; // 5分

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
