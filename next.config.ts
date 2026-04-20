import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  serverExternalPackages: ['pg', '@prisma/adapter-pg', 'bcryptjs'],
};

export default nextConfig;
