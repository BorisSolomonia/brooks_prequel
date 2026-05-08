'use client';

export default function CreatorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-ig-text-primary">Couldn&rsquo;t load this creator.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-ig-bg-secondary px-4 py-2 text-sm hover:bg-ig-border"
      >
        Try again
      </button>
    </div>
  );
}
