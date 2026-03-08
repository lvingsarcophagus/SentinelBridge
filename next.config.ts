import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Configure CSS loaders to work properly in ESM mode
    config.module.rules.forEach((rule: any) => {
      if (Array.isArray(rule.use)) {
        rule.use.forEach((use: any) => {
          if (typeof use === "object" && use.loader) {
            // Ensure postcss-loader and css-loader work in ESM
            if (use.loader.includes("postcss-loader")) {
              use.options = {
                ...use.options,
                // Use postcss-safe-parser for better ESM compatibility
              };
            }
            if (use.loader.includes("css-loader")) {
              use.options = {
                ...use.options,
                // esModule: false works better in ESM webpack context
                esModule: true,
              };
            }
          }
        });
      }
    });

    return config;
  },
  env: {
    NEXT_PUBLIC_CHAIN_CONFIG: process.env.NEXT_PUBLIC_CHAIN_CONFIG || "mainnet",
  },
};

export default nextConfig;
