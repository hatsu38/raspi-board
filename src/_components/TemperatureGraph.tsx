'use client';

type TemperatureGraphProps = {
  temperatures: number[];
};

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 60;
const PADDING_Y = 8;
// ラベルは transform: translateY(-120%) で自身の高さの1.2倍上へ浮かせるため、
// 上端からの最小距離はコンテナ高さの%ではなくラベル自身のフォントサイズ(em)基準で
// 確保する。%基準にすると、明日/明後日のように行の高さが低い段ではラベルが
// 天気アイコン行にはみ出してしまう(コンテナ高さが変わってもtranslateの量は変わらないため)。
const MIN_LABEL_TOP = '1.8em';

/*
 * 気温配列を折れ線で描く。日ごとの最高/最低で正規化するため、
 * 日によって気温の絶対値は違っても線の高さの起伏は常にフルスケールで見える。
 *
 * 数値ラベルはSVG内テキストではなくHTML要素(.fs-2xs)を重ねて配置する。
 * viewBoxをpreserveAspectRatio="none"で非均等に(x/yで別倍率)引き伸ばすため、
 * SVG内にテキストを置くと段(今日/明日/明後日)ごとに高さが変わって読みにくくなるため。
 * 折れ線自体はvector-effectで線の太さだけ画面上一定に保つ。
 */
export function TemperatureGraph({ temperatures }: TemperatureGraphProps) {
  if (temperatures.length === 0) return null;

  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = max - min;

  const points = temperatures.map((temp, index) => {
    const xPercent = ((index + 0.5) / temperatures.length) * 100;
    const ratio = range === 0 ? 0.5 : (temp - min) / range;
    const yPercent =
      ((VIEW_HEIGHT - PADDING_Y - ratio * (VIEW_HEIGHT - PADDING_Y * 2)) / VIEW_HEIGHT) * 100;
    return { xPercent, yPercent, temp };
  });

  const polylinePoints = points
    .map((p) => `${(p.xPercent / 100) * VIEW_WIDTH},${(p.yPercent / 100) * VIEW_HEIGHT}`)
    .join(' ');

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--hot)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map((p, index) => (
        <span
          key={index}
          className="fs-2xs absolute font-bold text-hot"
          style={{
            left: `${p.xPercent}%`,
            top: `max(${p.yPercent}%, ${MIN_LABEL_TOP})`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          {Math.round(p.temp)}°
        </span>
      ))}
    </div>
  );
}
