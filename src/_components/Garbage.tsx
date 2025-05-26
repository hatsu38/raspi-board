'use client';

import { Dayjs } from "dayjs";

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
