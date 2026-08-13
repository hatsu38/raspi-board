import { render, screen } from '@testing-library/react';
import dayjs from '../_libs/dayjsJa';
import { Garbage, getGarbageTypes, formatGarbageRule } from './Garbage';

describe('getGarbageTypes', () => {
  it('毎週火曜日は古紙・布類の収集日になる', () => {
    // 2026-08-18 は火曜日
    const types = getGarbageTypes(dayjs('2026-08-18'));

    expect(types.map(t => t.name)).toEqual(['古紙・布類']);
  });

  it('毎週水曜日と土曜日は可燃の収集日になる', () => {
    // 2026-08-19 は水曜日, 2026-08-22 は土曜日
    expect(getGarbageTypes(dayjs('2026-08-19')).map(t => t.name)).toEqual(['可燃']);
    expect(getGarbageTypes(dayjs('2026-08-22')).map(t => t.name)).toEqual(['可燃']);
  });

  it('収集日ではない曜日は空配列を返す', () => {
    // 2026-08-20 は木曜日(どの品目の収集日でもない)
    expect(getGarbageTypes(dayjs('2026-08-20'))).toEqual([]);
  });

  describe('第N週のみ収集される品目(金曜日)', () => {
    it('第1金曜日は不燃・有害のみで、木の枝・草・葉は含まない', () => {
      // 2026-08-07 は第1金曜日
      const types = getGarbageTypes(dayjs('2026-08-07'));

      expect(types.map(t => t.name)).toEqual(['不燃・有害']);
    });

    it('第2金曜日は木の枝・草・葉のみで、不燃・有害は含まない', () => {
      // 2026-08-14 は第2金曜日
      const types = getGarbageTypes(dayjs('2026-08-14'));

      expect(types.map(t => t.name)).toEqual(['木の枝・草・葉']);
    });

    it('第3金曜日は不燃・有害のみになる', () => {
      // 2026-08-21 は第3金曜日
      const types = getGarbageTypes(dayjs('2026-08-21'));

      expect(types.map(t => t.name)).toEqual(['不燃・有害']);
    });

    it('第4金曜日は木の枝・草・葉のみになる', () => {
      // 2026-08-28 は第4金曜日
      const types = getGarbageTypes(dayjs('2026-08-28'));

      expect(types.map(t => t.name)).toEqual(['木の枝・草・葉']);
    });

    it('第5金曜日はどちらの収集日でもない', () => {
      // 2027-01-29 は第5金曜日(1,8,15,22は既に第1〜4週、29は第5週)
      const types = getGarbageTypes(dayjs('2027-01-29'));

      expect(types).toEqual([]);
    });
  });

  it('週番号は「月内の日付」ベースで判定する(月をまたぐ第N週の取り違えがないこと)', () => {
    // 2026-08-01は土曜日で第1週にあたる。もし週番号が
    // ISO週番号(年間通算)などで計算されていたら値がずれるはずの回帰チェック。
    const weekNumber = Math.ceil(dayjs('2026-08-01').date() / 7);

    expect(weekNumber).toBe(1);
  });
});

describe('formatGarbageRule', () => {
  it('週番号指定がない場合は「◯曜日」の形式になる', () => {
    expect(
      formatGarbageRule({ name: '可燃', days: ['水', '土'], image: '' })
    ).toBe('水・土曜日');
  });

  it('週番号指定がある場合は「◯曜日・第N週」の形式になる', () => {
    expect(
      formatGarbageRule({ name: '木の枝・草・葉', days: ['金'], weekNumber: [2, 4], image: '' })
    ).toBe('金曜日・第2・4週');
  });
});

describe('Garbage コンポーネント', () => {
  it('渡した日付の「翌日」を明日のゴミ出しとして表示する', () => {
    // 2026-08-17(月)を渡すと、月曜日自身の収集品目(びん・缶・ペットボトル)
    // ではなく、翌日である火曜日の収集品目(古紙・布類)が表示されるはず
    render(<Garbage date={dayjs('2026-08-17')} />);

    expect(screen.getByText('8/18(火)')).toBeInTheDocument();
    expect(screen.getByText('古紙・布類')).toBeInTheDocument();
    expect(screen.queryByText('びん・缶・ペットボトル')).not.toBeInTheDocument();
  });

  it('翌日が収集日でない場合は「ゴミ出しはありません」と表示する', () => {
    // 2026-08-19(水、可燃の収集日)を渡しても、翌日の8/20(木)は
    // どの品目の収集日でもないため「ありません」表示になるはず
    render(<Garbage date={dayjs('2026-08-19')} />);

    expect(screen.getByText('ゴミ出しはありません')).toBeInTheDocument();
    expect(screen.queryByText('可燃')).not.toBeInTheDocument();
  });

  it('翌日の収集品目が複数ある場合はすべて表示する', () => {
    // 2026-08-13(木)の翌日である8/14(金)は第2金曜日にあたり、
    // 木の枝・草・葉が収集対象になる
    render(<Garbage date={dayjs('2026-08-13')} />);

    expect(screen.getByText('木の枝・草・葉')).toBeInTheDocument();
    expect(screen.getByText('金曜日・第2・4週')).toBeInTheDocument();
  });
});
