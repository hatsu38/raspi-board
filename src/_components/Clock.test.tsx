import { render, screen } from '@testing-library/react';
import dayjs from '../_libs/dayjsJa';
import { Clock } from './Clock';

// 時刻はTimeContext(1秒ごとに更新される実時間)に依存しているため、
// 表示ロジックだけを決定的に検証できるようuseTimeをモックする。
jest.mock('../_contexts/TimeContext', () => ({
  useTime: () => ({ time: dayjs('2026-08-13 22:31:33') }),
}));

describe('Clock', () => {
  it('日付を「YYYY/MM/DD(曜日)」の形式で表示する', () => {
    render(<Clock />);

    expect(screen.getByText('2026/08/13(木)')).toBeInTheDocument();
  });

  // 数字は等幅セルに入れるため1文字ずつ span に分割される。
  // getByText は直下のテキストノードしか見ないため、aria-label で引く。
  it('時刻を時:分と秒に分けて表示する', () => {
    render(<Clock />);

    expect(screen.getByLabelText('22:31')).toHaveTextContent('22:31');
    expect(screen.getByLabelText(':33')).toHaveTextContent(':33');
  });
});
