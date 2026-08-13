'use client';

import { useTime } from "../_contexts/TimeContext";

export function Clock() {
  const { time } = useTime();

  return (
    <div className="flex flex-col items-center">
      <p className="fs-md tracking-widest text-white/60">
        {time.format("YYYY/MM/DD")}({time.format("ddd")})
      </p>
      {/* tabular-nums で数字の桁幅を固定し、秒の更新で時刻がガタつかないようにする */}
      <div className="flex items-baseline font-mono tabular-nums tracking-tight">
        <span className="fs-clock font-semibold leading-none text-white">
          {time.format("HH:mm")}
        </span>
        <span className="fs-2xl font-medium leading-none text-white/40">
          {time.format(":ss")}
        </span>
      </div>
    </div>
  );
}
