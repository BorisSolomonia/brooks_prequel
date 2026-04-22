import Link from 'next/link';

interface SearchSectionProps {
  title: string;
  totalCount: number;
  seeAllHref: string;
  children: React.ReactNode;
}

export default function SearchSection({ title, totalCount, seeAllHref, children }: SearchSectionProps) {
  if (totalCount === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ig-text-primary">{title}</h2>
        {totalCount > 5 && (
          <Link
            href={seeAllHref}
            className="text-sm text-ig-action-blue hover:underline"
          >
            See all {totalCount} results
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
