'use client';

import { useEffect } from 'react';
import { useTime } from '../_contexts/TimeContext';
import { getThemeByHour } from '../_utils/theme';

/**
 * 時刻に応じて html の data-theme を昼夜で切り替える。
 * globals.css の [data-theme="night"] が配色トークンを上書きする。
 *
 * 判定は getThemeByHour に切り出してテスト対象にしてあり、
 * ここは DOM への反映だけを担う。
 */
export function useThemeByHour() {
  const { time } = useTime();
  const theme = getThemeByHour(time.hour());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
