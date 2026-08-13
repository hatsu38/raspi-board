import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio, lightnessDifference } from '../_utils/color';

/*
 * globals.css の配色トークンが、実機の 7 インチパネルで破綻しないことを検証する。
 *
 * 経緯: 暖色クリーム配色にしたとき、カード面(#fffcf5)と地(#fbf3e3)の明度差が
 * ΔL* = 3.0 しかなく、MacBook Pro では綺麗に見えるのに実機ではカードの境界が
 * すべて消えて「白一色」に見えた。安価なパネルは 6bit + ディザリングで、
 * 白に近い領域の階調から先に潰れるため。
 *
 * 目視では気づけない種類の破綻なので、閾値をテストで固定する。
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
