import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Lets the dev server be opened at http://http://192.168.11.204:3000
  allowedDevOrigins: ["192.168.11.204:300"],
  // Same-origin proxy to Express: cookies stay first-party, no CORS needed
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ] }];
  },
};
export default config;