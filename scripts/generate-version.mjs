// ビルドごとに一意な識別子を public/version.json へ書き出す。
// キオスク表示中のブラウザはこのファイルを定期的に読み、値が変わったら
// 新しいデプロイが来たとみなして自分をリロードする(src/_hooks/useDeployReload.ts)。
//
// 比較に使うのは builtAt のみ。同じコミットを再デプロイしても値が変わるよう、
// コミットSHAではなくビルド時刻を基準にしている。commit は
// 「いま画面に出ているのはどのコミットか」を人が確認するための付加情報。
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function resolveCommit() {
  // Vercel はビルド時にコミットSHAを環境変数で渡してくる
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }

  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    // gitのないビルド環境(tarball展開など)では特定できない
    return 'unknown';
  }
}

const publicDir = path.join(import.meta.dirname, '..', 'public');
const outputPath = path.join(publicDir, 'version.json');
const version = {
  builtAt: new Date().toISOString(),
  commit: resolveCommit(),
};

mkdirSync(publicDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(version, null, 2)}\n`);

console.log(`generated ${path.relative(process.cwd(), outputPath)}: ${version.builtAt} (${version.commit})`);
