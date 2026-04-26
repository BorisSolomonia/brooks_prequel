import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-ig-primary">
      <h1 className="text-5xl font-semibold text-ig-text-primary mb-4">Brooks</h1>
      <p className="text-lg text-ig-text-secondary mb-8 text-center max-w-md">
        Discover amazing travel guides from creators around the world.
        Plan your next adventure with curated itineraries.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-md bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
        >
          Get Started
        </Link>
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center rounded-md border border-ig-border px-6 py-2.5 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover"
        >
          Explore Guides
        </Link>
      </div>
    </div>
  );
}
