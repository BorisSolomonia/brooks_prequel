'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { streamPost } from '@/lib/api';
import type { AiProvider } from '@/types';

type Provider = AiProvider;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  tripId: string;
  availableProviders: Provider[];
}

const PROVIDER_LABELS: Record<Provider, string> = {
  OPENAI: 'GPT-4o',
  GEMINI: 'Gemini',
  ANTHROPIC: 'Claude',
};

export function BuyerChatPanel({ tripId, availableProviders }: Props) {
  const { token } = useAccessToken();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>(availableProviders[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || streaming || !token) return;
    const userMessage = input.trim();
    setInput('');
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);

    await streamPost(
      '/api/ai/buyer-chat',
      { tripId, provider, userMessage, history },
      token,
      (chunk) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      },
      undefined,
      (status) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: status === 401
              ? 'Your session expired. Please sign in again.'
              : 'Sorry — the AI is unavailable right now. Please try again in a moment.',
          };
          return next;
        });
      }
    );

    setStreaming(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <span>✨</span>
        <span>Ask AI about this guide</span>
      </button>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] flex flex-col" style={{ height: 420 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">✨ Ask AI</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="text-xs border border-[var(--border)] rounded px-2 py-0.5 bg-[var(--bg-primary)] text-[var(--text-secondary)]"
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center mt-8">
            Ask anything about this guide — restaurants, timing, transport, and more.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block text-sm px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about this guide…"
          disabled={streaming}
          className="flex-1 text-sm px-3 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="px-4 py-1.5 text-sm rounded-lg bg-[var(--brand-primary)] text-white font-medium disabled:opacity-40"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
