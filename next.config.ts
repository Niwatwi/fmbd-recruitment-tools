import type { NextConfig } from "next";

const nextConfig: any = {
  turbopack: { root: __dirname },
  i18n: { locales: ["th", "en"], defaultLocale: "th" },
};

export default nextConfig;
