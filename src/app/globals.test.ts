import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio, lightnessDifference } from '../_utils/color';

/*
 * globals.css が実機の 7 インチパネルで破綻しないことを検証する。
 *
 * 配色と文字サイズの 2 つを見ている。どちらも「開発機の MacBook Pro では
 * 何の問題もなく見えるのに実機で破綻する」種類の制約で、目視では気づけない。
 * だから閾値をテストで固定する。
 */

/*
 * 配色。
 *
 * 経緯: 暖色クリーム配色にしたとき、カード面(#fffcf5)と地(#fbf3e3)の明度差が
 * ΔL* = 3.0 しかなく、MacBook Pro では綺麗に見えるのに実機ではカードの境界が
 * すべて消えて「白一色」に見えた。安価なパネルは 6bit + ディザリングで、
 * 白に近い領域の階調から先に潰れるため。
 */

// 面と面が分離して見えるのに必要な明度差。
// 理想環境での識別限界(JND)は ΔL* ≒ 1 だが、階調が潰れるパネルを 1m 先から
// 見る前提では、その数倍の余裕がないと同一の面に見える。
const MIN_SURFACE_SEPARATION = 8;

// 1px の罫線は面より不利なので、より大きな差を要求する
const MIN_BORDER_SEPARATION = 10;

// 文字のコントラスト比。WCAG AA(4.5:1)を最低ラインとし、本文は AAA(7:1)を狙う
const MIN_BODY_TEXT_CONTRAST = 7;
const MIN_TEXT_CONTRAST = 4.5;

// 文字以外(インジケーターの点、カードの縁取りなど)の下限
const MIN_NON_TEXT_CONTRAST = 3;

function readTokens(blockSelector: RegExp): Record<string, string> {
  const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');
  const block = css.match(blockSelector);
  if (!block) {
    throw new Error(`globals.css に ${blockSelector} のブロックが見つかりません`);
  }

  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

describe.each([
  ['昼(:root)', /:root\s*\{([^}]*)\}/],
  ['夜([data-theme="night"])', /\[data-theme="night"\]\s*\{([^}]*)\}/],
])('%s の配色', (_name, selector) => {
  const token = readTokens(selector);

  describe('面の分離', () => {
    it('カード面と地が別の面として見分けられる', () => {
      expect(lightnessDifference(token.surface, token.base)).toBeGreaterThanOrEqual(
        MIN_SURFACE_SEPARATION
      );
    });

    it('強調カードの面と地が別の面として見分けられる', () => {
      expect(lightnessDifference(token['surface-today'], token.base)).toBeGreaterThanOrEqual(
        MIN_SURFACE_SEPARATION
      );
    });

    it('カードの罫線が地から浮き上がる', () => {
      expect(lightnessDifference(token.line, token.base)).toBeGreaterThanOrEqual(
        MIN_BORDER_SEPARATION
      );
    });

    it('カードの罫線がカード面からも浮き上がる', () => {
      expect(lightnessDifference(token.line, token.surface)).toBeGreaterThanOrEqual(
        MIN_BORDER_SEPARATION
      );
    });
  });

  describe('文字の可読性(カード面の上)', () => {
    it('本文が AAA 相当のコントラストを持つ', () => {
      expect(contrastRatio(token.ink, token.surface)).toBeGreaterThanOrEqual(MIN_BODY_TEXT_CONTRAST);
    });

    it.each(['ink-soft', 'ink-faint'])('補助的な文字色 %s が AA を満たす', name => {
      expect(contrastRatio(token[name], token.surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    });

    it.each(['hot', 'cold', 'accent-ink', 'leaf-ink'])(
      '意味を持つ文字色 %s が AA を満たす',
      name => {
        expect(contrastRatio(token[name], token.surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    );
  });

  describe('文字以外', () => {
    it('アクセント色が地の上で図として認識できる', () => {
      expect(contrastRatio(token.accent, token.base)).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST);
    });

    it('アクセント色の上に置く文字が読める', () => {
      expect(contrastRatio(token['on-accent'], token.accent)).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST
      );
    });
  });
});

/*
 * 文字サイズ。
 *
 * 経緯: 「視認距離 1m には 5.7vh 以上」と README に基準を書きながら、実際の
 * .fs-* スケールは時計以外すべてその下にあり、玄関から読めない状態が続いていた。
 *
 * さらに 5.7vh という数字自体が「font-size = 文字高」という前提で出したもので、
 * 実際の字面は em を埋めきらない。下の INK_RATIO は Zen Maru Gothic Bold で
 * 実測した比率で、数字は em の 7 割しかない。同じ font-size でも数字は和文より
 * 小さく見えるため、気温は天気 telop より大きい font-size を要求する。
 */

// EVICIV 7 インチ(16:9, 1080px)の画面高 87.2mm から算出した 1vh の物理サイズ
const VH_IN_MM = 0.872;

// 視認距離 1m で快適に読める文字高(掲示物の経験則: 文字高 mm × 200 ≒ 視認距離 mm)
const MIN_INK_HEIGHT_MM = 5;

// font-size に対する実インクの高さの比(Zen Maru Gothic Bold で実測)
const INK_RATIO = {
  kanji: 0.885,
  digit: 0.721,
} as const;

/*
 * 遠距離(1m)から読む層。ここに挙げたクラスだけが 5mm 基準の対象で、
 * 日付・降水確率・服装の文言などは「近づいて読む」前提なのでサイズを問わない。
 * 遠くから読ませたい情報を増やすときは、このリストに足してから CSS を書く。
 */
const DISTANCE_READABLE = [
  { className: 'fs-clock', script: 'digit', usage: '時刻' },
  { className: 'fs-today-telop', script: 'kanji', usage: '今日の天気' },
  { className: 'fs-today-temp', script: 'digit', usage: '今日の気温' },
] as const;

function readFontSizes(): Record<string, number> {
  const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

  const sizes: Record<string, number> = {};
  for (const [, name, body] of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const fontSize = body.match(/font-size:\s*calc\(([\d.]+)vh/);
    if (fontSize) {
      sizes[name] = Number(fontSize[1]);
    }
  }
  return sizes;
}

describe('遠距離(1m)からの可読性', () => {
  const fontSize = readFontSizes();

  it.each(DISTANCE_READABLE)('$usage(.$className)が 1m から読める', ({ className, script }) => {
    const vh = fontSize[className];
    if (vh === undefined) {
      throw new Error(`globals.css に .${className} の font-size 定義が見つかりません`);
    }

    expect(vh * INK_RATIO[script] * VH_IN_MM).toBeGreaterThanOrEqual(MIN_INK_HEIGHT_MM);
  });
});
