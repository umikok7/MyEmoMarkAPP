import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/.netlify/functions/api/:path*",
      },
    ];
  },
};

export default nextConfig;
