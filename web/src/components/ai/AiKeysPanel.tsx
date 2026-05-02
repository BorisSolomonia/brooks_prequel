'use client';

import { useState, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { AiKeyResponse, AiProvider } from '@/types';

type Provider = AiProvider;

const PROVIDER_CONFIGS: { id: Provider; label: string; placeholder: string }[] = [
  { id: 'OPENAI', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'GEMINI', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'ANTHROPIC', label: 'Anthropic Claude', placeholder: 'sk-ant-...' },
];

export const PROVIDER_MODELS: Record<Provider, { id: string; label: string }[]> = {
  OPENAI: [
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'o3', label: 'o3' },
    { id: 'o4-mini', label: 'o4-mini' },
  ],
  ANTHROPIC: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  GEMINI: [
    { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

export function AiKeysPanel() {
  const { token } = useAccessToken();
  const [keys, setKeys] = useState<AiKeyResponse[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [rawKey, setRawKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<AiKeyResponse[]>('/api/me/ai-keys', token).then(setKeys);
  }, [token]);

  function startEdit(provider: Provider, existingModel: string | null) {
    setEditing(provider);
    setRawKey('');
    setSelectedModel(existingModel ?? PROVIDER_MODELS[provider][0].id);
  }

  async function saveKey(provider: Provider) {
    if (!token || !rawKey) return;
    setSaving(true);
    try {
      const saved = await api.put<AiKeyResponse>('/api/me/ai-keys', { provider, rawKey, model: selectedModel || undefined }, token);
      setKeys((prev) => {
        const existing = prev.find((k) => k.provider === provider);
        return existing
          ? prev.map((k) => k.provider === provider ? saved : k)
          : [...prev, saved];
      });
      setEditing(null);
      setRawKey('');
    } finally {
      setSaving(false);
    }
  }

  async function deleteKey(provider: Provider) {
    if (!token) return;
    await api.delete('/api/me/ai-keys/' + provider, token);
    setKeys((prev) => prev.filter((k) => k.provider !== provider));
  }

  const keyMap = Object.fromEntries(keys.map((k) => [k.provider, k]));

  return (
    <div>
      <p className="text-sm text-[var(--text-tertiary)] mb-4">
        Keys are encrypted and stored securely. Brooks never uses them without your permission.
      </p>

      <div className="space-y-4">
        {PROVIDER_CONFIGS.map(({ id, label, placeholder }) => {
          const saved = keyMap[id];
          const models = PROVIDER_MODELS[id];
          const modelLabel = saved?.selectedModel
            ? (models.find((m) => m.id === saved.selectedModel)?.label ?? saved.selectedModel)
            : null;

          return (
            <div key={id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-elevated)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{label}</span>
                  {saved && (
                    <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                      …{saved.keyHint}
                      {modelLabel && <> · {modelLabel}</>}
                      {' · '}saved {new Date(saved.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => startEdit(id, saved?.selectedModel ?? null)}
                    className="min-h-11 rounded-md px-2 text-sm text-[var(--brand-primary)] hover:underline"
                  >
                    {saved ? 'Replace' : 'Add'}
                  </button>
                  {saved && (
                    <button
                      onClick={() => deleteKey(id)}
                      className="min-h-11 rounded-md px-2 text-sm text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {editing === id && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={placeholder}
                      value={rawKey}
                      onChange={(e) => setRawKey(e.target.value)}
                      className="min-h-11 flex-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-base text-[var(--text-primary)] md:text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="min-h-11 flex-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-base text-[var(--text-primary)] md:text-sm"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    <button
                      disabled={saving || !rawKey}
                      onClick={() => saveKey(id)}
                      className="min-h-11 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditing(null); setRawKey(''); }}
                      className="min-h-11 rounded-md px-2 text-sm text-[var(--text-tertiary)] hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
