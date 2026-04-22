'use client';

interface StarInputProps {
  value: number;
  onChange: (next: number) => void;
}

export default function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition ${star <= value ? 'text-yellow-400' : 'text-ig-border hover:text-yellow-300'}`}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
