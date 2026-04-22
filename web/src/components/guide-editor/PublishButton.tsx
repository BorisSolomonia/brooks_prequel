'use client';

import { useState } from 'react';

interface Props {
  onPublish: () => Promise<void>;
  disabled?: boolean;
}

export default function PublishButton({ onPublish, disabled }: Props) {
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
      className="px-4 py-2 bg-ig-success text-white rounded-md text-sm font-semibold disabled:opacity-50 hover:opacity-90"
    >
      Publish
    </button>
  );
}
