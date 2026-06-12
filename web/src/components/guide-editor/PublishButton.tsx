'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onPublish: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export default function PublishButton({ onPublish, disabled, label }: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('guideEditor.publishButton.defaultLabel');
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
        <span className="text-sm text-ig-text-secondary">{t('guideEditor.publishButton.confirmQuestion')}</span>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="mw-button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {publishing ? t('guideEditor.publishButton.publishing') : t('guideEditor.publishButton.confirmBtn')}
        </button>
        <button onClick={() => setConfirming(false)} className="px-3 py-2 text-sm font-semibold text-ig-text-secondary hover:text-ig-text-primary">{t('guideEditor.publishButton.cancelBtn')}</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="mw-button-primary min-h-11 rounded-md px-4 py-2 text-sm disabled:opacity-50"
    >
      {resolvedLabel}
    </button>
  );
}
