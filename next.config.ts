import type { NextConfig } from "next";

/**
 * Canonical host. Both majedali.com and www.majedali.com resolve to Railway and
 * serve the site, so without this they are two URLs for identical content —
 * which splits SEO signals and reports as two hostnames in analytics.
 */
const CANONICAL_HOST = "majedali.com";

/**
 * Baseline browser hardening. Deliberately conservative: every header here is
 * safe for a site that loads Next's own runtime plus Google Analytics.
 *
 * A full `script-src`/`style-src` CSP is NOT here on purpose. Next injects
 * inline bootstrap scripts and GA injects inline config, so a meaningful policy
 * needs nonces threaded through the app — worth doing, but only behind a smoke
 * test that proves the page still boots and GA still fires. `frame-ancestors`
 * is the one CSP directive that carries no such risk, so it ships now alongside
 * its older `X-Frame-Options` equivalent for browsers that ignore it.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    // Nothing on this site uses any of these; deny them outright.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    // One year, no `includeSubDomains` and no `preload`: Railway serves the
    // apex over HTTPS only, but a future subdomain shouldn't inherit a pin that
    // takes a year to expire, and preload is effectively irreversible.
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
];

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
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
