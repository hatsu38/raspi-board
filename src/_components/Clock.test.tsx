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

  it('時刻を時:分と秒に分けて表示する', () => {
    render(<Clock />);

    expect(screen.getByText('22:31')).toBeInTheDocument();
    expect(screen.getByText(':33')).toBeInTheDocument();
  });
});
