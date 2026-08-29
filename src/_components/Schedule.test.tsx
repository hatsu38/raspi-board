import { render, screen } from '@testing-library/react';
import { Schedule } from './Schedule';
import { useSchedule } from '../_contexts/ScheduleContext';
import dayjs from '../_libs/dayjsJa';

jest.mock('../_contexts/ScheduleContext');

describe('Schedule', () => {
  const today = dayjs('2026-08-28');

  it('取得できたら年月の見出しを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({ events: [], loading: false, error: null });

    render(<Schedule today={today} />);

    expect(screen.getByText('よてい 2026年8月')).toBeInTheDocument();
  });

  it('該当日のセルに予定タイトルを表示する', () => {
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

    render(<Schedule today={today} />);

    expect(screen.getByText('健診')).toBeInTheDocument();
  });

  it('1セルに3件以上ある場合は上限を超えた件数を「+N件」で表示する', () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      id: `${i}`,
      title: `予定${i}`,
      startAt: '2026-08-29T09:00:00+09:00',
      endAt: '2026-08-29T10:00:00+09:00',
      allDay: false,
    }));
    (useSchedule as jest.Mock).mockReturnValue({ events, loading: false, error: null });

    render(<Schedule today={today} />);

    expect(screen.getByText('+2件')).toBeInTheDocument();
  });

  it('エラー時はエラーメッセージを表示する', () => {
    (useSchedule as jest.Mock).mockReturnValue({
      events: null,
      loading: false,
      error: '予定の取得に失敗しました',
    });

    render(<Schedule today={today} />);

    expect(screen.getByText('予定の取得に失敗しました')).toBeInTheDocument();
  });
});
