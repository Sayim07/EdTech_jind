const isProd = process.env.NODE_ENV === 'production';

// Baseline browser protections for every response.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Nobody should be able to put this site inside another page (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The camera is needed on this site for proctored tests; everything else stays off.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(self)' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A second dev server (tests, previews) must not share .next with the main one: set NEXT_DIST_DIR=.next-test.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
