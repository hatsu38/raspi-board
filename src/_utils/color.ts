/*
 * 配色の「見え方」を数値で検証するための色計算。
 *
 * このボードは 7 インチの安価なパネルに常時表示される。この種のパネルは
 * 6bit + ディザリングで、特に白に近い領域の階調が潰れる。開発機の
 * MacBook Pro では描き分けられる微差が実機では同じ色として表示されるため、
 * 目視では気づけない。配色の差を数値で担保するのが目的。
 */

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const value = hex.trim().replace('#', '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map(c => c + c)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`16進数の色として解釈できません: ${hex}`);
  }

  return [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16) / 255) as Rgb;
}

// sRGB のガンマを外して物理的な光量に戻す
function toLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** 相対輝度 (WCAG 定義。0=黒, 1=白) */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG のコントラスト比 (1〜21)。文字の読みやすさの指標 */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * CIE L* (0〜100)。人間の明るさの感じ方に沿った尺度。
 * コントラスト比は明るい色同士の差を過小評価する(白に近いほど 1.0 に張り付く)ため、
 * 「面と面が分離して見えるか」の判定にはこちらを使う。
 */
export function lightness(hex: string): number {
  const y = relativeLuminance(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

/** 2 色の明度差。面の分離が知覚できるかの判定に使う */
export function lightnessDifference(a: string, b: string): number {
  return Math.abs(lightness(a) - lightness(b));
}
