import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NETLIFY === "true") {
      return [
        {
          source: "/api/:path*",
          destination: "/.netlify/functions/api/:path*",
        },
      ]
    }
    return []
  },
  turbopack: {},
};

export default withPWA(nextConfig);
