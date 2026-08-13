import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

/*
 * 丸ゴシックで柔らかい印象にする。Raspberry Pi の Chromium には丸ゴシックが
 * 入っていないため、システムフォント任せにはできず Web フォントで配信する。
 *
 * 日本語グリフは unicode-range で 120 個ほどのチャンクに分割されて自前配信される。
 * preload を有効にすると全チャンクに <link rel="preload"> が付いて初回に 2.1MB を
 * 落としてしまうため、preload: false にして必要なチャンクだけ遅延取得させている
 * (display: "swap" なので初回だけ一瞬フォールバック書体で描画される)。
 * ファイル数を抑えるため weight は本文用と強調用の 2 つに絞っている。
 */
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Raspi Board",
  description: "Raspberry Pi用の情報ボードアプリケーション",
};

// タッチディスプレイでのピンチズーム・ダブルタップズームを無効化する
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // フォント変数は html に置く。globals.css の --font-sans が :root で
    // var(--font-zen-maru) を参照するため、body に置くと解決できず無効になる
    <html lang="ja" className={zenMaruGothic.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
