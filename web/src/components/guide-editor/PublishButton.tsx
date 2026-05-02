'use client';

import { useState } from 'react';

interface Props {
  onPublish: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export default function PublishButton({ onPublish, disabled, label = 'Publish' }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-ig-text-secondary">Publish this guide?</span>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-4 py-2 bg-ig-success text-white rounded-md text-sm font-semibold disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="px-3 py-2 text-ig-text-secondary text-sm">Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="min-h-11 rounded-md bg-ig-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
