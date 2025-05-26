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

type GarbageProps = {
  date: Dayjs;
};

export function Garbage({ date }: GarbageProps) {
  const garbageTypes = getGarbageTypes(date);

  if (garbageTypes.length === 0) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">今日のゴミ出し</h3>
        <p className="text-gray-300">ゴミ出しはありません</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-2">今日のゴミ出し</h3>
      <div className="flex flex-col gap-3">
        {garbageTypes.map((type) => (
          <div key={type.name} className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-2 hover:bg-white/20 transition-colors">
            <div className="relative w-12 h-12">
              <Image
                src={type.image}
                alt={type.name}
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-gray-200">
                {type.name}
              </span>
              <span className="text-xs text-gray-400">
                {type.days.join('・')}曜日
                {type.weekNumber && `（第${type.weekNumber.join('・')}週）`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
