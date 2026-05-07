/** @type {import('next').NextConfig} */
// Scope the GCS allowlist to the configured bucket so next/image cannot be used to
// proxy arbitrary public GCS objects from other tenants.
const gcsBucket = process.env.GCS_BUCKET || process.env.NEXT_PUBLIC_GCS_BUCKET;
const gcsPattern = gcsBucket
  ? { protocol: 'https', hostname: 'storage.googleapis.com', pathname: `/${gcsBucket}/**` }
  : { protocol: 'https', hostname: 'storage.googleapis.com' };

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      gcsPattern,
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
