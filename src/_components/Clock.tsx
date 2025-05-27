'use client';

import { useTime } from "../_contexts/TimeContext";

export function Clock() {
  const { time } = useTime();

  return (
    <div className="font-light font-robot flex flex-col items-center">
      <p className="text-xl text-white">{time.format("YYYY/MM/DD")}({time.format("dd")})</p>
      <h2 className="text-7xl tracking-tight text-white">
        {time.format("HH:mm:ss")}
      </h2>
    </div>
  );
}
