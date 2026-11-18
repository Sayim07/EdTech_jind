/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second dev server (tests, previews) must not share .next with the main one: set NEXT_DIST_DIR=.next-test.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
