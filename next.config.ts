import type { NextConfig } from "next";

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
};

export default nextConfig;
