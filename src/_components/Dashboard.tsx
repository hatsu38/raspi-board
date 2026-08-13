'use client';

import { CSSProperties } from "react";
import { Dayjs } from "dayjs";
import { Weather } from "./Weather";
import { Clock } from "./Clock";
import { Garbage } from "./Garbage";
import { useWeather } from "../_contexts/WeatherContext";
import { useDisplayMode, DISPLAY_MODES } from "../_contexts/DisplayModeContext";
import Image from "next/image";

type DashboardProps = {
  dates: Dayjs[];
};

// 全画面モード時の文字・画像の拡大率(globals.css の --scale を参照)
const fullscreenStyle = (scale: number) => ({ '--scale': scale } as CSSProperties);

function ClothingIndexCard() {
  const { clothingIndex } = useWeather();

  return (
    <section className="panel flex min-h-0 flex-col items-center p-[2vh]">
      <h3 className="fs-sm font-medium text-white/60">今日の服装指数</h3>
      {clothingIndex ? (
        <>
          {/* aspect-square で幅から高さを決めることで、flex-1 の高さ確定を待たずに
              next/image の fill が高さ0と誤認する警告を避ける */}
          <div className="relative my-[1.5vh] aspect-square w-[65%] max-h-full">
            <Image
              src={clothingIndex.image}
              alt={clothingIndex.description}
              fill
              // 常時表示画面でファーストビューに写る画像のため、
              // LCP候補として優先読み込みする
              priority
              className="object-contain rounded-[1.5vh]"
            />
          </div>
          <p className="fs-md text-center font-semibold leading-snug text-white">
            {clothingIndex.description}
          </p>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="fs-md text-white/40">取得中…</p>
        </div>
      )}
    </section>
  );
}

function ModeIndicator() {
  const { mode } = useDisplayMode();

  return (
    <div className="pointer-events-none absolute bottom-[1.2vh] left-1/2 flex -translate-x-1/2 gap-[1vh]">
      {DISPLAY_MODES.map((m) => (
        <span
          key={m}
          className={`h-[0.8vh] rounded-full transition-all duration-300 ${
            m === mode ? 'w-[3.5vh] bg-white/60' : 'w-[0.8vh] bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}

export function Dashboard({ dates }: DashboardProps) {
  const { mode } = useDisplayMode();

  const renderContent = () => {
    switch (mode) {
      case 'clock':
        return (
          <div className="flex h-full items-center justify-center" style={fullscreenStyle(2.2)}>
            <Clock />
          </div>
        );
      case 'garbage':
        return (
          <div className="h-full p-[6vh]" style={fullscreenStyle(1.8)}>
            <Garbage date={dates[0]} />
          </div>
        );
      case 'weather':
        return (
          <div className="h-full p-[3vh]" style={fullscreenStyle(1.3)}>
            <Weather dates={dates} />
          </div>
        );
      default:
        return (
          <div className="grid h-full grid-rows-[5fr_7fr] gap-[2.5vh] p-[2.5vh] pb-[3.5vh]">
            <div className="grid min-h-0 grid-cols-[1.2fr_1fr_1fr] gap-[2.5vh]">
              <section className="panel flex items-center justify-center">
                <Clock />
              </section>
              <ClothingIndexCard />
              <section className="panel min-h-0">
                <Garbage date={dates[0]} />
              </section>
            </div>
            <div className="min-h-0">
              <Weather dates={dates} />
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderContent()}
      <ModeIndicator />
    </>
  );
}
