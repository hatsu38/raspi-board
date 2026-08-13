import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ホームディレクトリ直下に無関係なpackage-lock.jsonがあると
  // Next.jsがそちらをワークスペースルートと誤認し、起動時に
  // 警告を出す(かつファイルトレースの探索範囲も余計に広がる)ため、
  // このリポジトリを明示的にルートとして固定する
  outputFileTracingRoot: path.join(__dirname),
  // ローカル配信のキオスク用途のため画像最適化は不要。
  // 最適化を無効にすることで、気象庁ドメインの天気アイコンが
  // remotePatterns 未設定で 400 になる問題も解消される
  images: {
    unoptimized: true,
  },
  env: {
    OPEN_WEATHER_API_KEY: process.env.OPEN_WEATHER_API_KEY,
    EKISPART_API_KEY: process.env.EKISPART_API_KEY,
  },
};

export default nextConfig;
