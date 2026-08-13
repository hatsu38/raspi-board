import { getWeatherIconKind } from './weatherIcon';

describe('getWeatherIconKind', () => {
  describe('単一の天気', () => {
    it.each([
      ['晴れ', 'sunny'],
      ['曇り', 'cloudy'],
      ['くもり', 'cloudy'],
      ['雨', 'rain'],
    ])('%s → %s', (telop, expected) => {
      expect(getWeatherIconKind(telop)).toBe(expected);
    });
  });

  describe('先頭の語を主たる天気として扱う', () => {
    it('晴時々曇は晴を主とする', () => {
      expect(getWeatherIconKind('晴時々曇')).toBe('sunny-cloudy');
    });

    it('曇時々晴は曇を主とする', () => {
      expect(getWeatherIconKind('曇時々晴')).toBe('cloudy');
    });

    it('雨のち晴は雨を主とする', () => {
      expect(getWeatherIconKind('雨のち晴')).toBe('rain');
    });
  });

  describe('雨を含む場合は傘の要否が伝わる方を優先する', () => {
    it.each([['晴一時雨'], ['晴時々雨'], ['曇時々雨'], ['曇一時雨'], ['晴のち雨']])(
      '%s → cloudy-rain',
      (telop) => {
        expect(getWeatherIconKind(telop)).toBe('cloudy-rain');
      },
    );
  });

  describe('激しい天気は主従に関係なくそれ自体を示す', () => {
    it.each([
      ['雷雨', 'thunder'],
      ['晴時々雷雨', 'thunder'],
      ['雪', 'snow'],
      ['晴時々雪', 'snow'],
      ['雪時々曇', 'snow'],
      ['大雨', 'heavy-rain'],
      ['暴風雨', 'heavy-rain'],
    ])('%s → %s', (telop, expected) => {
      expect(getWeatherIconKind(telop)).toBe(expected);
    });

    it('雪と雷が同時に含まれる場合は雷を優先する', () => {
      expect(getWeatherIconKind('雷を伴う雪')).toBe('thunder');
    });
  });

  describe('判定できない telop', () => {
    it.each([[''], ['観測なし'], ['暴風'], ['砂じん嵐']])('%s → null(公式アイコンにフォールバック)', (telop) => {
      expect(getWeatherIconKind(telop)).toBeNull();
    });
  });
});
