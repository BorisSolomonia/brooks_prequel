/** @type {import('next').NextConfig} */
// Scope the GCS allowlist to the configured bucket so next/image cannot be used to
// proxy arbitrary public GCS objects from other tenants. Production builds MUST
// provide GCS_BUCKET (or NEXT_PUBLIC_GCS_BUCKET) — falling back to an unscoped
// pattern would let next/image proxy any public GCS object, a cross-tenant data
// leak vector. Non-production builds (CI smoke test, local dev) are allowed to
// run without it; we simply omit the GCS pattern, and next/image will refuse
// GCS URLs at runtime — visible failure instead of a security hole.
const gcsBucket = process.env.GCS_BUCKET || process.env.NEXT_PUBLIC_GCS_BUCKET;
if (!gcsBucket && process.env.NODE_ENV === 'production') {
  throw new Error(
    'GCS_BUCKET (or NEXT_PUBLIC_GCS_BUCKET) must be set for production builds. ' +
    'Without it, next/image would proxy any public storage.googleapis.com object. ' +
    'Set it via --build-arg in your Dockerfile or your CI/CD env config.'
  );
}
const gcsPatterns = gcsBucket
  ? [{ protocol: 'https', hostname: 'storage.googleapis.com', pathname: `/${gcsBucket}/**` }]
  : [];

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      ...gcsPatterns,
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Seed data (V22, V35) references unsplash for mock creator avatars and guide
      // cover images. Drop this entry once seed data is replaced with real uploads.
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
