import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // タイムゾーンをJSTへ固定する(理由はjest.globalSetup.tsのコメント参照)。
  // setupFilesAfterEnvではなくglobalSetupで行う必要がある。
  globalSetup: '<rootDir>/jest.globalSetup.ts',
  // .claude/worktrees/* はリポジトリ全体の別チェックアウトを含むため、
  // package.json の重複によるhaste module衝突や二重実行を避けるため除外する
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
};

export default createJestConfig(config);
