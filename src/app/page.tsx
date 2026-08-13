'use client';

import { TimeProvider } from "../_contexts/TimeContext";
import { WeatherProvider } from "../_contexts/WeatherContext";
import { DisplayModeProvider } from "../_contexts/DisplayModeContext";
import { useTime } from "../_contexts/TimeContext";
import { useDisplayMode } from "../_contexts/DisplayModeContext";
import { useMemo } from "react";
import { Dashboard } from "../_components/Dashboard"
import { useReloadOnNewDeploy } from "../_hooks/useReloadOnNewDeploy";

function MainContent() {
  const { time } = useTime();
  const { toggleMode } = useDisplayMode();

  const dates = useMemo(() => {
    return [0, 1, 2].map(days => time.add(days, 'day'));
  }, [time]);

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-slate-950 cursor-pointer"
      onClick={toggleMode}
      // 長押しのコンテキストメニュー(選択ツールバーや仮想キーボードの出現要因)を防ぐ
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 背景の淡いグラデーション */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_15%_0%,rgba(56,189,248,0.10),transparent),radial-gradient(50%_70%_at_90%_100%,rgba(129,140,248,0.08),transparent)]"
      />
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
