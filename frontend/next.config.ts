import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to FastAPI backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
