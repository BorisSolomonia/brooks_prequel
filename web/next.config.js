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
