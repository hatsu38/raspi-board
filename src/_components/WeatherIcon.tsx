'use client';

import Image from 'next/image';
import { getWeatherIconKind, type WeatherIconKind } from '../_utils/weatherIcon';

type WeatherIconProps = {
  telop: string;
  /** telop から種類を判定できなかったときに表示する天気 API の公式アイコン */
  fallbackUrl?: string;
};

// 雲のシルエット。雨・雪・雷では下に余白を作るため上へずらして使う
const CLOUD_PATH =
  'M8.5 22.5h13.8a4.7 4.7 0 0 0 .3-9.4 6.7 6.7 0 0 0-12.8-1.6A4.9 4.9 0 0 0 8.5 22.5z';

const Cloud = ({ shiftUp = false }: { shiftUp?: boolean }) => (
  <g transform={shiftUp ? 'translate(0,-3)' : undefined}>
    <path d={CLOUD_PATH} fill="var(--cloud)" />
  </g>
);

const Drops = ({ xs }: { xs: number[] }) => (
  <g stroke="var(--cold)" strokeWidth="2.6" strokeLinecap="round">
    {xs.map((x) => (
      <path key={x} d={`M${x} 23.5l-1.4 4.5`} />
    ))}
  </g>
);

const ICONS: Record<WeatherIconKind, React.ReactNode> = {
  sunny: (
    <>
      <circle cx="16" cy="16" r="7" fill="var(--sun)" />
      <g stroke="var(--sun)" strokeWidth="2.6" strokeLinecap="round">
        <path d="M16 2.5v3.5M16 26v3.5M2.5 16h3.5M26 16h3.5M6.4 6.4l2.5 2.5M23.1 23.1l2.5 2.5M25.6 6.4l-2.5 2.5M8.9 23.1l-2.5 2.5" />
      </g>
    </>
  ),
  'sunny-cloudy': (
    <>
      <circle cx="11.5" cy="10.5" r="5.5" fill="var(--sun)" />
      <Cloud />
    </>
  ),
  cloudy: (
    <>
      {/* 奥にもう一枚重ねて厚みを出す */}
      <g transform="translate(3.5,-4)" opacity="0.5">
        <path d={CLOUD_PATH} fill="var(--cloud)" />
      </g>
      <Cloud />
    </>
  ),
  'cloudy-rain': (
    <>
      <Cloud shiftUp />
      <Drops xs={[13, 19]} />
    </>
  ),
  rain: (
    <>
      <Cloud shiftUp />
      <Drops xs={[11, 15.5, 20, 24.5]} />
    </>
  ),
  'heavy-rain': (
    <>
      <Cloud shiftUp />
      <g stroke="var(--cold)" strokeWidth="3" strokeLinecap="round">
        <path d="M11 22.5l-2 7M16 22.5l-2 7M21 22.5l-2 7M26 22.5l-2 7" />
      </g>
    </>
  ),
  snow: (
    <>
      <Cloud shiftUp />
      <g fill="var(--cold)">
        <circle cx="12" cy="25.5" r="1.8" />
        <circle cx="18" cy="25.5" r="1.8" />
        <circle cx="24" cy="25.5" r="1.8" />
      </g>
    </>
  ),
  thunder: (
    <>
      <Cloud shiftUp />
      <path d="M17.5 21.5l-4.5 5.5h2.9l-1.1 4.2 5-6.1h-2.9z" fill="var(--accent)" />
    </>
  ),
};

export function WeatherIcon({ telop, fallbackUrl }: WeatherIconProps) {
  const kind = getWeatherIconKind(telop);

  if (!kind) {
    if (!fallbackUrl) return null;
    return <Image src={fallbackUrl} alt={telop} fill className="object-contain" />;
  }

  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={telop} className="h-full w-full">
      {ICONS[kind]}
    </svg>
  );
}
