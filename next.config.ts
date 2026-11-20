import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the slim runtime image.
  output: 'standalone',
  // Do not advertise the framework in a header — pure hygiene, not the lab.
  poweredByHeader: false,
  // The lab ships no remote images; skip the optimizer (and its native deps).
  images: { unoptimized: true },
};

export default nextConfig;
