interface GuideCardProps {
  title: string;
  creatorName: string;
  imageUrl?: string | null;
  dayCount?: number;
  placeCount?: number;
}

export default function GuideCard({ title, creatorName, imageUrl, dayCount, placeCount }: GuideCardProps) {
  return (
    <div className="bg-ig-primary rounded-lg border border-ig-border overflow-hidden hover:brightness-110 transition-all">
      <div className="aspect-[4/3] bg-ig-elevated relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ig-text-tertiary">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-ig-text-primary truncate">{title}</h3>
        <p className="text-sm text-ig-text-secondary mt-0.5">{creatorName}</p>
        {(dayCount || placeCount) && (
          <div className="flex gap-3 mt-2 text-xs text-ig-text-tertiary">
            {dayCount && <span>{dayCount} days</span>}
            {placeCount && <span>{placeCount} places</span>}
          </div>
        )}
      </div>
    </div>
  );
}
