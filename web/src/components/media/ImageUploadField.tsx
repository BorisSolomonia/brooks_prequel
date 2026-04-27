'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadMedia(file, usage, token);
      onChange(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
            className="text-xs font-semibold text-ig-text-tertiary transition-colors hover:text-ig-error"
          >
            Remove
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
            No image selected
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="min-h-11 rounded-md bg-ig-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover disabled:opacity-60"
          >
            {uploading ? 'Uploading...' : value ? 'Replace image' : 'Upload image'}
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
      setError(err instanceof Error ? err.message : 'Upload failed');
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
                className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || remaining === 0}
        className="min-h-11 rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover disabled:opacity-60"
      >
        {uploading ? 'Uploading...' : remaining === 0 ? 'Image limit reached' : 'Upload place image'}
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
