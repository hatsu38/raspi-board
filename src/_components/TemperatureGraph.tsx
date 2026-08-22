'use client';

type TemperatureGraphProps = {
  temperatures: number[];
};

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 60;
const PADDING_Y = 8;

/*
 * 気温配列を折れ線で描く。日ごとの最高/最低で正規化するため、
 * 日によって気温の絶対値は違っても線の高さの起伏は常にフルスケールで見える。
 */
export function TemperatureGraph({ temperatures }: TemperatureGraphProps) {
  if (temperatures.length === 0) return null;

  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = max - min;

  const points = temperatures.map((temp, index) => {
    const x = ((index + 0.5) / temperatures.length) * VIEW_WIDTH;
    const ratio = range === 0 ? 0.5 : (temp - min) / range;
    const y = VIEW_HEIGHT - PADDING_Y - ratio * (VIEW_HEIGHT - PADDING_Y * 2);
    return { x, y, temp };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <polyline points={polylinePoints} fill="none" stroke="var(--hot)" strokeWidth="2" />
      {points.map((p, index) => (
        <text
          key={index}
          x={p.x}
          y={Math.max(p.y - 4, 8)}
          textAnchor="middle"
          fontSize="9"
          fill="var(--hot)"
          fontWeight="700"
        >
          {Math.round(p.temp)}°
        </text>
      ))}
    </svg>
  );
}
