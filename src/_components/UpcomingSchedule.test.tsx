import { render, screen } from '@testing-library/react';
import { UpcomingSchedule } from './UpcomingSchedule';
import { useSchedule } from '../_contexts/ScheduleContext';
import dayjs from '../_libs/dayjsJa';

jest.mock('../_contexts/ScheduleContext');

describe('UpcomingSchedule', () => {
  const now = dayjs('2026-08-28T10:00:00+09:00');

  it('エラー時はエラーメッセージを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: null,
      loading: false,
      error: '予定の取得に失敗しました',
    });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('予定の取得に失敗しました')).toBeInTheDocument();
  });

  it('予定がない場合は「予定はありません」と表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({ events: [], loading: false, error: null });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('予定はありません')).toBeInTheDocument();
  });

  it('直近の予定を日付・時刻・タイトルとともに表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: [
        {
          id: '1',
          title: '健診',
          startAt: '2026-08-29T09:00:00+09:00',
          endAt: '2026-08-29T10:00:00+09:00',
          allDay: false,
        },
      ],
      loading: false,
      error: null,
    });

    render(<UpcomingSchedule now={now} />);

    expect(screen.getByText('健診')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('8/29(土)')).toBeInTheDocument();
  });
});
