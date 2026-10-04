'use client';

import { useEffect, useRef } from "react";
import { reloadPage } from "../_libs/reloadPage";
import { fetchBuiltAt } from "../_libs/fetchBuiltAt";
import { isWeatherStale, STALE_RELOAD_THRESHOLD } from "../_utils/weatherFreshness";

const CHECK_INTERVAL = 60 * 1000; // 1分

// キオスク表示はページを開いたまま何日も動き続けるため、ブラウザ側の通信状態が
// 壊れるなどして天気を取得できない状態に陥ると、古い予報のまま止まってしまう。
// 原因を問わず復旧できるよう、天気を長く取得できていなければページごと読み込み直す。
export function useReloadWhenWeatherStale(lastUpdatedAt: number | null) {
  // 定期チェックは effect を張り直さずに最新の取得時刻を読みたいため ref に写す
  const lastUpdatedAtRef = useRef(lastUpdatedAt);
  useEffect(() => {
    lastUpdatedAtRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);

  useEffect(() => {
    // 一度も取得できていない場合は、表示を始めた時刻から数える
    const mountedAt = Date.now();

    const reloadIfStale = async () => {
      const since = lastUpdatedAtRef.current ?? mountedAt;
      if (!isWeatherStale(since, Date.now(), STALE_RELOAD_THRESHOLD)) {
        return;
      }

      // オフライン中にリロードするとブラウザのエラーページに置き換わり、
      // 通信が戻っても自力で復旧できなくなる。アプリのサーバーに届くときだけリロードする
      if ((await fetchBuiltAt()) === null) {
        return;
      }
      reloadPage();
    };

    const interval = setInterval(reloadIfStale, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);
}
