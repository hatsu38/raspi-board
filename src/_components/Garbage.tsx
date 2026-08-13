'use client';

import { Dayjs } from "dayjs";
import Image from "next/image";

type GarbageType = {
  name: string;
  days: string[];
  weekNumber?: number[];
  image: string;
};

const garbageSchedule: GarbageType[] = [
  {
    name: "木の枝・草・葉",
    days: ["金"],
    weekNumber: [2, 4],
    image: "/garbages/木の枝・草・葉.png",
  },
  {
    name: "古紙・布類",
    days: ["火"],
    image: "/garbages/古紙・布類.png",
  },
  {
    name: "びん・缶・ペットボトル",
    days: ["月"],
    image: "/garbages/びん・缶・ペットボトル.png",
  },
  {
    name: "可燃",
    days: ["水", "土"],
    image: "/garbages/可燃.png",
  },
  {
    name: "不燃・有害",
    days: ["金"],
    weekNumber: [1, 3],
    image: "/garbages/不燃・有害.png",
  },
];

export function getGarbageTypes(date: Dayjs): GarbageType[] {
  const weekNumber = Math.ceil(date.date() / 7);
  const dayOfWeek = date.format('ddd');

  return garbageSchedule.filter(schedule => {
    const isCorrectDay = schedule.days.includes(dayOfWeek);
    if (!isCorrectDay) return false;

    if (schedule.weekNumber) {
      return schedule.weekNumber.includes(weekNumber);
    }
    return true;
  });
}

// 収集ルールの表示用文字列(例: 「金曜日・第2・4週」)
export function formatGarbageRule(type: GarbageType): string {
  const days = `${type.days.join('・')}曜日`;
  return type.weekNumber ? `${days}・第${type.weekNumber.join('・')}週` : days;
}

type GarbageProps = {
  date: Dayjs;
};

export function Garbage({ date }: GarbageProps) {
  const tomorrow = date.add(1, 'day');
  const garbageTypes = getGarbageTypes(tomorrow);

  return (
    <div className="flex h-full min-h-0 flex-col items-center p-[2vh]">
      <h3 className="fs-sm font-medium text-white/60">
        明日のゴミ出し
        <span className="ml-[1.5vh] text-white/40">{tomorrow.format('M/D')}({tomorrow.format('ddd')})</span>
      </h3>
      {garbageTypes.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="fs-lg font-medium text-white/50">ゴミ出しはありません</p>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col justify-center gap-[1.5vh] py-[1vh]">
          {garbageTypes.map((type) => (
            <div key={type.name} className="flex min-h-0 flex-1 items-center justify-center gap-[2.5vh]">
              <div className="relative h-full max-h-[calc(15vh*var(--scale,1))] aspect-square shrink-0">
                <Image
                  src={type.image}
                  alt={type.name}
                  fill
                  className="object-contain rounded-[1.5vh]"
                />
              </div>
              <div className="flex flex-col items-start gap-[0.6vh]">
                <span className="fs-lg font-bold leading-tight text-white">
                  {type.name}
                </span>
                <span className="fs-xs rounded-full bg-white/10 px-[1.4vh] py-[0.4vh] text-white/60">
                  {formatGarbageRule(type)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
