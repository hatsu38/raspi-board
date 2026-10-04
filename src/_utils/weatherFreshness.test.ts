import { isWeatherStale } from './weatherFreshness';

const MINUTE = 60 * 1000;
const UPDATED_AT = new Date('2026-10-04T12:00:00+09:00').getTime();

describe('isWeatherStale', () => {
  it('最終更新からしきい値未満なら古くない', () => {
    expect(isWeatherStale(UPDATED_AT, UPDATED_AT + 14 * MINUTE, 15 * MINUTE)).toBe(false);
  });

  it('最終更新からちょうどしきい値経ったら古い', () => {
    expect(isWeatherStale(UPDATED_AT, UPDATED_AT + 15 * MINUTE, 15 * MINUTE)).toBe(true);
  });

  it('最終更新からしきい値を超えたら古い', () => {
    expect(isWeatherStale(UPDATED_AT, UPDATED_AT + 3 * 60 * MINUTE, 15 * MINUTE)).toBe(true);
  });
});
