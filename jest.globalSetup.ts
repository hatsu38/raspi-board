// このアプリの日付計算はJSTを前提にしている(dayjsJa.ts参照)。CI(ubuntu-latestはTZ=UTC)や
// 開発者のローカル環境のタイムゾーンに関わらずテスト結果を安定させるため、
// テスト実行前にプロセスのタイムゾーンをJSTへ固定する。
//
// setupFilesAfterEnv(jest.setup.ts)ではなくglobalSetupでこれを行う理由:
// jest-environment-jsdomはテスト環境(jsdomのグローバルオブジェクト)を
// setupFiles/setupFilesAfterEnvより前に生成しており、その時点でDate/Intlが
// 参照するタイムゾーンの内部キャッシュが確定してしまう。そのため
// setupFilesAfterEnv側でprocess.env.TZを書き換えても手遅れで
// (実測: Intl.DateTimeFormat().resolvedOptions().timeZoneやDateのオフセットは
// 変化しない)、jsdom環境が生成されるより前、つまりJestのメインプロセスで
// 一度だけ実行されるglobalSetupでTZを設定する必要がある。
export default async function globalSetup(): Promise<void> {
  process.env.TZ = 'Asia/Tokyo';
}
