/** @type {import('next').NextConfig} */
// Scope the GCS allowlist to the configured bucket so next/image cannot be
// used to proxy arbitrary public GCS objects from other tenants. If
// GCS_BUCKET is unset we OMIT the GCS pattern entirely — next/image then
// rejects every storage.googleapis.com URL, which is visible failure
// (broken images) rather than the previous silent-leak fallback. We do not
// throw here, because next.config.js is also loaded by `next lint` and
// dev/CI workflows that don't need the bucket; throwing on a missing env
// var breaks those flows. The deploy pipeline does its OWN explicit check
// before the production docker build (see .github/workflows/deploy.yml).
const gcsBucket = process.env.GCS_BUCKET || process.env.NEXT_PUBLIC_GCS_BUCKET;
if (!gcsBucket && process.env.NODE_ENV === 'production') {
  console.warn(
    '[next.config] GCS_BUCKET is unset for a production build — next/image ' +
    'will refuse all storage.googleapis.com URLs. Set GCS_BUCKET via ' +
    '--build-arg to allow scoped GCS images.'
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
