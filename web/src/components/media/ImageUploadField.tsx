'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { MediaUsage } from '@/types';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

interface ImageUploadFieldProps {
  token: string;
  usage: MediaUsage;
  label: string;
  value: string;
  onChange: (url: string) => void;
  helpText?: string;
  previewShape?: 'circle' | 'wide' | 'square';
}

interface ImageUploadListProps {
  token: string;
  usage: MediaUsage;
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  maxImages: number;
}

const previewClasses = {
  circle: 'h-24 w-24 rounded-full',
  wide: 'aspect-video w-full rounded-md',
  square: 'h-20 w-20 rounded-md',
};

export function ImageUploadField({
  token,
  usage,
  label,
  value,
  onChange,
  helpText,
  previewShape = 'wide',
}: ImageUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadMedia(file, usage, token);
      onChange(uploaded.url);
      toast.success(t('widgets.imageUpload.uploadedSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('widgets.imageUpload.uploadFailed');
      console.error('[ImageUploadField] upload failed:', err);
      setError(msg);
      // Also surface as a toast so the user can't miss it. The inline
      // <p> below is a nicety; the toast is the loud signal.
      toast.error(t('widgets.imageUpload.uploadFailedWithMsg', { msg }));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-ig-text-secondary">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="min-h-11 rounded-md px-3 text-sm font-semibold text-ig-text-tertiary transition-colors hover:text-ig-error lg:min-h-0 lg:px-0 lg:text-xs"
          >
            {t('widgets.imageUpload.remove')}
          </button>
        )}
      </div>

      <div className="rounded-md border border-ig-border bg-ig-secondary p-3">
        {value ? (
          <img
            src={value}
            alt=""
            className={`${previewClasses[previewShape]} object-cover border border-ig-border`}
          />
        ) : (
          <div className={`${previewClasses[previewShape]} flex items-center justify-center border border-dashed border-ig-border text-sm text-ig-text-tertiary`}>
            {t('widgets.imageUpload.noImageSelected')}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {uploading && <Spinner />}
            {uploading ? t('widgets.imageUpload.uploading') : value ? t('widgets.imageUpload.replaceImage') : t('widgets.imageUpload.uploadImage')}
          </button>
          {helpText && <p className="text-xs text-ig-text-tertiary">{helpText}</p>}
        </div>
        {error && <p className="mt-2 text-xs text-ig-error">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}

export function ImageUploadList({
  token,
  usage,
  label,
  values,
  onChange,
  maxImages,
}: ImageUploadListProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, maxImages - values.length);

  const handleFiles = async (files: FileList | null) => {
    if (!files || remaining === 0) return;
    const selectedFiles = Array.from(files).slice(0, remaining);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const uploaded = await api.uploadMedia(file, usage, token);
        uploadedUrls.push(uploaded.url);
      }
      onChange([...values, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('widgets.imageUpload.uploadFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-ig-text-secondary">{label}</label>
        <span className="text-xs text-ig-text-tertiary">{values.length}/{maxImages}</span>
      </div>

      {values.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {values.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-md border border-ig-border bg-ig-elevated">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== url))}
                className="absolute right-1 top-1 min-h-10 rounded bg-black/70 px-3 py-1 text-xs font-semibold text-white lg:min-h-0 lg:px-2"
              >
                {t('widgets.imageUpload.remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || remaining === 0}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover disabled:opacity-60"
      >
        {uploading && <Spinner />}
        {uploading ? t('widgets.imageUpload.uploading') : remaining === 0 ? t('widgets.imageUpload.imageLimitReached') : t('widgets.imageUpload.uploadPlaceImage')}
      </button>
      {error && <p className="text-xs text-ig-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
