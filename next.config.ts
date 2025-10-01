import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['jsonwebtoken', '@vercel/blob'],
};

export default nextConfig;