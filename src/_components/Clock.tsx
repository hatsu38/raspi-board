'use client';

import { useTime } from "../_contexts/TimeContext";

export function Clock() {
  const { time } = useTime();

  return (
    <div className="font-light font-robot">
      <p className="text-2xl text-thinGray">{time.format("YYYY/MM/DD")}({time.format("dd")})</p>
      <h2 className="text-8xl tracking-tight">
        {time.format("HH:mm:ss")}
      </h2>
    </div>
  );
}
