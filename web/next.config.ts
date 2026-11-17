import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.LOCAL_BROWSER_TEST === "1" ? ".next-test" : ".next",
  poweredByHeader: false,
  // Repository instructions are maintained through the explicitly approved harness.
  agentRules: false,
  devIndicators: false,
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ] }]; },
};
export default config;
