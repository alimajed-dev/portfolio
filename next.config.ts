import type { NextConfig } from "next";

/**
 * Canonical host. Both majedali.com and www.majedali.com resolve to Railway and
 * serve the site, so without this they are two URLs for identical content —
 * which splits SEO signals and reports as two hostnames in analytics.
 */
const CANONICAL_HOST = "majedali.com";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
