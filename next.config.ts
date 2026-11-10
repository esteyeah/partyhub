import type { NextConfig } from 'next';

/**
 * Export 100 % statique (dossier out/) pour GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH = "/nom-du-depot" en production (défini par le workflow GitHub Actions).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
