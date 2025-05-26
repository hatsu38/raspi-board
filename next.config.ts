import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    OPEN_WEATHER_API_KEY: process.env.OPEN_WEATHER_API_KEY,
    EKISPART_API_KEY: process.env.EKISPART_API_KEY,
  },
};

export default nextConfig;
