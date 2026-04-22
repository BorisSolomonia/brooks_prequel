import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-ig-primary">
      <h1 className="text-5xl font-semibold text-ig-text-primary mb-4">Brooks</h1>
      <p className="text-lg text-ig-text-secondary mb-8 text-center max-w-md">
        Discover amazing travel guides from creators around the world.
        Plan your next adventure with curated itineraries.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="px-6 py-[10px] bg-ig-blue text-white rounded-md font-semibold text-sm hover:bg-ig-blue-hover transition-colors"
        >
          Get Started
        </Link>
        <Link
          href="/search"
          className="px-6 py-[10px] border border-ig-border text-ig-text-primary rounded-md font-semibold text-sm hover:bg-ig-hover transition-colors"
        >
          Explore Guides
        </Link>
      </div>
    </div>
  );
}
