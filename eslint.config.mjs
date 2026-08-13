import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Codeのgit worktree(.claude/worktrees/*)はリポジトリの
    // 別チェックアウトを丸ごと含むため、二重にlintしないよう除外する
    ".claude/**",
  ]),
]);

export default eslintConfig;
