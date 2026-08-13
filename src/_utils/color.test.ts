import { relativeLuminance, contrastRatio, lightness, lightnessDifference } from './color';

describe('relativeLuminance', () => {
  it('黒は 0、白は 1 を返す', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('3桁の短縮表記を6桁と同じに扱う', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 10);
  });

  it('16進数として解釈できない値は例外にする', () => {
    expect(() => relativeLuminance('rgba(0,0,0,0.5)')).toThrow();
  });
});

describe('contrastRatio', () => {
  it('黒と白は最大の 21:1 になる', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('同じ色同士は 1:1 になる', () => {
    expect(contrastRatio('#4a3728', '#4a3728')).toBeCloseTo(1, 5);
  });

  it('引数の順序を入れ替えても同じ値になる', () => {
    expect(contrastRatio('#fffcf5', '#4a3728')).toBeCloseTo(contrastRatio('#4a3728', '#fffcf5'), 10);
  });
});

describe('lightness', () => {
  it('黒は 0、白は 100 を返す', () => {
    expect(lightness('#000000')).toBeCloseTo(0, 4);
    expect(lightness('#ffffff')).toBeCloseTo(100, 4);
  });
});

describe('lightnessDifference', () => {
  it('明るい色同士の差を、コントラスト比より鋭敏に捉える', () => {
    // 実機で問題になった 2 色。コントラスト比では 1.1 未満に潰れて差が読み取れないが、
    // 明度差なら「3 しかない」と判定できる
    const base = '#fbf3e3';
    const surface = '#fffcf5';

    expect(contrastRatio(base, surface)).toBeLessThan(1.1);
    expect(lightnessDifference(base, surface)).toBeGreaterThan(2);
    expect(lightnessDifference(base, surface)).toBeLessThan(4);
  });

  it('引数の順序によらず絶対値を返す', () => {
    expect(lightnessDifference('#000000', '#ffffff')).toBeCloseTo(100, 4);
    expect(lightnessDifference('#ffffff', '#000000')).toBeCloseTo(100, 4);
  });
});
