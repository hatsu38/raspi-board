import { getThemeByHour } from './theme';

describe('getThemeByHour', () => {
  it('日中(6時〜20時台)は day を返す', () => {
    expect(getThemeByHour(6)).toBe('day');
    expect(getThemeByHour(12)).toBe('day');
    expect(getThemeByHour(20)).toBe('day');
  });

  it('夜(21時〜5時台)は night を返す', () => {
    expect(getThemeByHour(21)).toBe('night');
    expect(getThemeByHour(23)).toBe('night');
    expect(getThemeByHour(0)).toBe('night');
    expect(getThemeByHour(5)).toBe('night');
  });

  it('切り替わりの境界を含む時刻で判定が入れ替わる', () => {
    expect(getThemeByHour(20)).toBe('day');
    expect(getThemeByHour(21)).toBe('night');
    expect(getThemeByHour(5)).toBe('night');
    expect(getThemeByHour(6)).toBe('day');
  });
});
