'use client';

import { TimeProvider } from "../_contexts/TimeContext";
import { WeatherProvider } from "../_contexts/WeatherContext";
import { DisplayModeProvider } from "../_contexts/DisplayModeContext";
import { useTime } from "../_contexts/TimeContext";
import { useDisplayMode } from "../_contexts/DisplayModeContext";
import { useMemo } from "react";
import { Dashboard } from "../_components/Dashboard"
import { useReloadOnNewDeploy } from "../_hooks/useReloadOnNewDeploy";
import { useThemeByHour } from "../_hooks/useThemeByHour";

function MainContent() {
  const { time } = useTime();
  const { toggleMode } = useDisplayMode();

  // 夜は配色を落とす。TimeProvider の内側でしか時刻が読めないためここで呼ぶ
  useThemeByHour();

  const dates = useMemo(() => {
    return [0, 1, 2].map(days => time.add(days, 'day'));
  }, [time]);

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-base cursor-pointer"
      onClick={toggleMode}
      // 長押しのコンテキストメニュー(選択ツールバーや仮想キーボードの出現要因)を防ぐ
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 背景の淡いグラデーション(色は昼夜のトークンに追従する) */}
      <div className="board-bg pointer-events-none absolute inset-0" />
      <Dashboard dates={dates} />
    </div>
  );
}

export default function Home() {
  // キオスク表示は開いたまま操作されないため、新デプロイの反映は自前で行う
  useReloadOnNewDeploy();

  return (
    <TimeProvider>
      <WeatherProvider>
        <DisplayModeProvider>
          <MainContent />
        </DisplayModeProvider>
      </WeatherProvider>
    </TimeProvider>
  );
}
