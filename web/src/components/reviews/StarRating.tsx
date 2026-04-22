'use client';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md';
}

const STAR_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
};

export default function StarRating({ rating, size = 'md' }: StarRatingProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${STAR_SIZE[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? 'text-yellow-400' : 'text-ig-border'}>
          ★
        </span>
      ))}
    </span>
  );
}
