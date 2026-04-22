'use client';

import { FormEvent, useEffect, useState } from 'react';
import StarInput from './StarInput';

interface ReviewComposerProps {
  title: string;
  textLimit: number;
  initialRating?: number;
  initialReviewText?: string | null;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (payload: { rating: number; reviewText: string | null }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function ReviewComposer({
  title,
  textLimit,
  initialRating = 0,
  initialReviewText = '',
  submitLabel,
  savingLabel,
  onSubmit,
  onDelete,
}: ReviewComposerProps) {
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState(initialReviewText ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(initialRating);
    setReviewText(initialReviewText ?? '');
  }, [initialRating, initialReviewText]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Select a star rating');
      return;
    }
    if (reviewText.length > textLimit) {
      setError(`Review must be ${textLimit} characters or fewer`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        rating,
        reviewText: reviewText.trim() ? reviewText.trim() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Delete this review?')) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      setRating(0);
      setReviewText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ig-border bg-ig-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ig-text-primary">{title}</h3>
          <p className="mt-1 text-xs text-ig-text-tertiary">Rating is required. Text review is optional.</p>
        </div>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <textarea
        value={reviewText}
        onChange={(event) => setReviewText(event.target.value)}
        maxLength={textLimit}
        rows={4}
        placeholder="Share what stood out. Line breaks and links are supported."
        className="mt-4 w-full rounded-xl border border-ig-border bg-ig-primary px-3 py-2 text-sm text-ig-text-primary outline-none transition focus:border-brand-500/40"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className={reviewText.length > textLimit ? 'text-ig-error' : 'text-ig-text-tertiary'}>
          {reviewText.length}/{textLimit}
        </span>
        {error && <span className="text-ig-error">{error}</span>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? savingLabel : submitLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleDelete}
            className="rounded-lg border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary transition hover:text-ig-text-primary disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  );
}
