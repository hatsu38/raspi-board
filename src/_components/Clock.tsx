'use client';

import { useTime } from "../_contexts/TimeContext";

/*
 * Zen Maru Gothic は tnum(等幅数字)を持たないため font-variant-numeric: tabular-nums が
 * 効かず、数字ごとに字幅が異なる(135px 表示で 55.2〜68.6px)。そのままだと秒の更新で
 * 時計が横に揺れるため、数字だけを最大字幅ぶんの固定セルに入れて中央寄せする。
 * 0.52em は実測した最大字幅 0.508em(= 68.6/135)の切り上げ。
 */
const DIGIT_CELL_WIDTH = '0.52em';

const FixedWidthDigits = ({ text }: { text: string }) => (
  <>
    {[...text].map((char, index) =>
      /\d/.test(char) ? (
        // 位置が固定の書式文字列なので index を key にしてよい
        <span
          key={index}
          className="inline-block text-center"
          style={{ width: DIGIT_CELL_WIDTH }}
        >
          {char}
        </span>
      ) : (
        <span key={index}>{char}</span>
      ),
    )}
  </>
);

export function Clock() {
  const { time } = useTime();

  const hoursMinutes = time.format("HH:mm");
  const seconds = time.format(":ss");

  return (
    <div className="flex flex-col items-center">
      <p className="fs-md font-medium tracking-widest text-ink-soft">
        {time.format("YYYY/MM/DD")}({time.format("ddd")})
      </p>
      {/* tabular-nums は Web フォント読み込み前のフォールバック書体に効かせるために残す */}
      <div className="flex items-baseline tabular-nums tracking-tight">
        {/* 数字が1文字ずつ span に分かれるため、読み上げ用に元の文字列を aria-label で持たせる */}
        <span className="fs-clock font-bold leading-none text-ink" aria-label={hoursMinutes}>
          <FixedWidthDigits text={hoursMinutes} />
        </span>
        <span className="fs-2xl font-medium leading-none text-ink-faint" aria-label={seconds}>
          <FixedWidthDigits text={seconds} />
        </span>
      </div>
    </div>
  );
}
