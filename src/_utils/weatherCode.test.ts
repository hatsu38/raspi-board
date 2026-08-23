import { getWeatherIconKindFromCode, getWeatherLabelFromCode } from './weatherCode';

describe('getWeatherIconKindFromCode', () => {
  it('コード0(晴れ)は sunny になる', () => {
    expect(getWeatherIconKindFromCode(0)).toBe('sunny');
  });

  it('コード2(晴れ時々曇り)は sunny-cloudy になる', () => {
    expect(getWeatherIconKindFromCode(2)).toBe('sunny-cloudy');
  });

  it('コード3(曇り)は cloudy になる', () => {
    expect(getWeatherIconKindFromCode(3)).toBe('cloudy');
  });

  it('コード61(弱い雨)は cloudy-rain になる', () => {
    expect(getWeatherIconKindFromCode(61)).toBe('cloudy-rain');
  });

  it('コード65(強い雨)は heavy-rain になる', () => {
    expect(getWeatherIconKindFromCode(65)).toBe('heavy-rain');
  });

  it('コード71(弱い雪)は snow になる', () => {
    expect(getWeatherIconKindFromCode(71)).toBe('snow');
  });

  it('コード95(雷雨)は thunder になる', () => {
    expect(getWeatherIconKindFromCode(95)).toBe('thunder');
  });

  it('未知のコードは cloudy にフォールバックする', () => {
    expect(getWeatherIconKindFromCode(9999)).toBe('cloudy');
  });
});

describe('getWeatherLabelFromCode', () => {
  it('コード0(晴れ)は「晴れ」になる', () => {
    expect(getWeatherLabelFromCode(0)).toBe('晴れ');
  });

  it('コード61(弱い雨)は「弱い雨」になる', () => {
    expect(getWeatherLabelFromCode(61)).toBe('弱い雨');
  });

  it('未知のコードは「不明」にフォールバックする', () => {
    expect(getWeatherLabelFromCode(9999)).toBe('不明');
  });
});
