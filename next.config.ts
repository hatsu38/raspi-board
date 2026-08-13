import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
