'use client';

interface StarInputProps {
  value: number;
  onChange: (next: number) => void;
}

export default function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`min-h-11 min-w-11 rounded-full text-2xl transition lg:min-h-9 lg:min-w-9 ${star <= value ? 'text-yellow-400' : 'text-ig-border hover:text-yellow-300'}`}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
