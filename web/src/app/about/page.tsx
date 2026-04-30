import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-140px)] max-w-4xl flex-col justify-center px-5 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ig-text-tertiary">About Brooks Prequel</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ig-text-primary md:text-6xl">
        Travel guides built around people, not lists.
      </h1>
      <div className="mt-7 space-y-5 text-base leading-7 text-ig-text-secondary md:text-lg">
        <p>
          Brooks Prequel is a travel-guide marketplace where creators publish personal itineraries, hidden places,
          memories, and practical routes that buyers can turn into trips.
        </p>
        <p>
          The product is designed for travelers who want context before they arrive: what to see, what to skip, how to
          plan a day, and how to move discoveries into maps and calendars without rebuilding everything manually.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/guides" className="rounded-md bg-ig-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover">
          Browse guides
        </Link>
        <Link href="/contact" className="rounded-md border border-ig-border px-5 py-3 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover">
          Contact
        </Link>
      </div>
    </main>
  );
}
