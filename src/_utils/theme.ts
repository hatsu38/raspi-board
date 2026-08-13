export type ThemeName = 'day' | 'night';

/*
 * 夜として扱う時間帯。常時表示のボードが暗い部屋で光源になるのを避けるため、
 * この間はクリーム地をやめて暗いトークンに切り替える。
 */
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 6;

export function getThemeByHour(hour: number): ThemeName {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR ? 'night' : 'day';
}
