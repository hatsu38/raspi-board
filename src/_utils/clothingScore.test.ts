import { calculateClothingScore, getClothingDescription } from './clothingScore';
import type { Forecast } from '../types/weather';

// 気温以外の補正要因(雨・天気・風)がすべて 0 になる中立なテスト用予報。
// 個々のテストは必要なフィールドだけを上書きして、検証したい要因を分離する。
function createNeutralForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    date: '2026-06-15',
    telop: '観測なし',
    temperature: {
      max: { celsius: '20' },
      min: { celsius: '20' },
    },
    chanceOfRain: {
      T00_06: '0%',
      T06_12: '0%',
      T12_18: '0%',
      T18_24: '0%',
    },
    detail: {
      wave: '0m',
      wind: '',
    },
    ...overrides,
  };
}

describe('calculateClothingScore', () => {
  describe('気温によるベーススコア', () => {
    it('気温がアンカー点と一致する場合はそのスコアを返す(20℃ → 58)', () => {
      const forecast = createNeutralForecast({
        temperature: { max: { celsius: '20' }, min: { celsius: '20' } },
      });

      expect(calculateClothingScore(forecast)).toBe(58);
    });

    it('気温がアンカー点と一致する場合はそのスコアを返す(30℃ → 85)', () => {
      const forecast = createNeutralForecast({
        temperature: { max: { celsius: '30' }, min: { celsius: '30' } },
      });

      expect(calculateClothingScore(forecast)).toBe(85);
    });

    it('アンカー点の間の気温は線形補間したスコアを返す', () => {
      // feelsLike = 22.5℃、アンカー(20,58)-(25,72)の中間 → 58 + 14*0.5 = 65
      const forecast = createNeutralForecast({
        temperature: { max: { celsius: '22.5' }, min: { celsius: '22.5' } },
      });

      expect(calculateClothingScore(forecast)).toBe(65);
    });

    it('低すぎる気温は下限のスコアでクランプされる', () => {
      const forecast = createNeutralForecast({
        temperature: { max: { celsius: '-20' }, min: { celsius: '-20' } },
      });

      expect(calculateClothingScore(forecast)).toBe(0);
    });

    it('高すぎる気温は上限のスコアでクランプされる', () => {
      const forecast = createNeutralForecast({
        temperature: { max: { celsius: '45' }, min: { celsius: '45' } },
      });

      expect(calculateClothingScore(forecast)).toBe(100);
    });
  });

  describe('最高/最低気温の重み付け', () => {
    it('最高気温側に重み付けされ、単純平均より高いスコアになる', () => {
      // 単純平均は20℃(アンカー一致でスコア58)だが、
      // 加重平均(最高65%/最低35%)では21.5℃相当になりそれより高いスコアになる
      const weighted = createNeutralForecast({
        temperature: { max: { celsius: '25' }, min: { celsius: '15' } },
      });
      const simpleAverageEquivalent = createNeutralForecast({
        temperature: { max: { celsius: '20' }, min: { celsius: '20' } },
      });

      expect(calculateClothingScore(weighted)).toBeGreaterThan(
        calculateClothingScore(simpleAverageEquivalent)
      );
      expect(calculateClothingScore(weighted)).toBe(62);
    });
  });

  describe('降水確率による補正', () => {
    it('06-12時・12-18時のうち降水確率が高い方を採用する', () => {
      const forecast = createNeutralForecast({
        chanceOfRain: { T00_06: '0%', T06_12: '20%', T12_18: '80%', T18_24: '0%' },
      });

      // ベーススコア58 - 80%帯の補正6 = 52
      expect(calculateClothingScore(forecast)).toBe(52);
    });

    it('降水確率が30%未満なら補正しない', () => {
      const forecast = createNeutralForecast({
        chanceOfRain: { T00_06: '0%', T06_12: '20%', T12_18: '0%', T18_24: '0%' },
      });

      expect(calculateClothingScore(forecast)).toBe(58);
    });
  });

  describe('天気telopによる補正', () => {
    it.each([
      ['雪', -6],
      ['雨', -4],
      ['曇', -2],
      ['晴', 2],
    ])('telopに「%s」を含む場合はスコアを%d補正する', (keyword, penalty) => {
      const forecast = createNeutralForecast({ telop: `所により${keyword}` });

      expect(calculateClothingScore(forecast)).toBe(58 + penalty);
    });
  });

  describe('風による補正', () => {
    it('波が高いほど大きく減点する', () => {
      const calm = createNeutralForecast({ detail: { wave: '0m', wind: '' } });
      const rough = createNeutralForecast({ detail: { wave: '3m', wind: '' } });

      expect(calculateClothingScore(rough)).toBeLessThan(calculateClothingScore(calm));
      expect(calculateClothingScore(rough)).toBe(58 - 5);
    });

    it('北風・強い風はそれぞれ独立に減点する', () => {
      const forecast = createNeutralForecast({
        detail: { wave: '2m', wind: '北の風やや強い' },
      });

      // 波(2m以上): -3, 北風: -2, 強い風: -3 の合計8点減点
      expect(calculateClothingScore(forecast)).toBe(58 - 8);
    });
  });

  describe('当日の気温が取得できない場合のフォールバック', () => {
    it('celsiusがnullのときは月平均気温(8月)を使って計算する', () => {
      const forecast = createNeutralForecast({
        date: '2026-08-13',
        temperature: { max: { celsius: null }, min: { celsius: null } },
      });

      // 8月の平年値(最高32/最低24) → feelsLike 29.2℃ → 82.92 → 四捨五入で83
      expect(calculateClothingScore(forecast)).toBe(83);
    });

    it('temperature自体が存在しない月でも壊れずデフォルト値で計算する', () => {
      const forecast = createNeutralForecast({
        date: '2026-08-13',
        temperature: {},
      });

      expect(calculateClothingScore(forecast)).toBe(83);
    });
  });
});

describe('getClothingDescription', () => {
  it('スコアと同じ閾値の説明文を返す(境界値)', () => {
    expect(getClothingDescription(10).description).toBe('ぶるぶる、何を着ても寒い！');
    expect(getClothingDescription(11).description).toBe('ダウンジャケットでしっかり防寒');
  });

  it('0点は最も寒い説明文になる', () => {
    expect(getClothingDescription(0).description).toBe('ぶるぶる、何を着ても寒い！');
  });

  it('100点は最も暑い説明文になる', () => {
    expect(getClothingDescription(100).description).toBe('暑さ対策必須！何を着ても暑い！');
  });

  it('scoreとimageを含むオブジェクトを返す', () => {
    const result = getClothingDescription(85);

    expect(result).toEqual({
      index: 85,
      description: 'ノースリーブでもかなり暑い！',
      image: '/clothes/90.png',
    });
  });
});
