import type { MediaUploadResponse, MediaUsage } from '@/types';
import { compressImageFile, maxEdgeForUsage } from '@/lib/imageCompression';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface RequestOptions extends RequestInit {
  token?: string;
}

// React Strict Mode and shared shell providers can request the same resource during
// one navigation. Coalescing only while a GET is in flight removes duplicate network
// and JSON work without introducing a stale-data cache.
const inFlightGets = new Map<string, Promise<unknown>>();

function requestIdentity(path: string, token?: string): string {
  return (token || 'public') + '\u0000' + path;
}

function clearInFlightGets(): void {
  inFlightGets.clear();
}

function getRequest<T>(path: string, token?: string): Promise<T> {
  const key = requestIdentity(path, token);
  const existing = inFlightGets.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = request<T>(path, { method: 'GET', token });
  inFlightGets.set(key, pending);
  const cleanup = () => {
    if (inFlightGets.get(key) === pending) {
      inFlightGets.delete(key);
    }
  };
  pending.then(cleanup, cleanup);
  return pending;
}

// Error carrying the HTTP status so callers can branch on it (e.g. treat a 404
// on DELETE as "already gone" rather than surfacing it as a failure).
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...rest,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function streamPost(
  path: string,
  body: unknown,
  token: string,
  onToken: (text: string) => void,
  onNamedEvent?: (eventName: string, data: string) => void,
  onError?: (status: number, body: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    onError?.(res.status, text);
    return;
  }
  if (!res.body) {
    onError?.(0, 'No response body');
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let pendingEvent = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith('event:')) {
        pendingEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const data = line.slice(5);
        if (pendingEvent && onNamedEvent) {
          onNamedEvent(pendingEvent, data);
          pendingEvent = '';
        } else {
          onToken(data);
        }
      }
    }
  }
}

export const api = {
  get: <T>(path: string, token?: string) =>
    getRequest<T>(path, token),

  post: <T>(path: string, body?: unknown, token?: string) => {
    clearInFlightGets();
    return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, token });
  },

  put: <T>(path: string, body: unknown, token?: string) => {
    clearInFlightGets();
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body), token });
  },

  patch: <T>(path: string, body: unknown, token?: string) => {
    clearInFlightGets();
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token });
  },

  delete: <T>(path: string, token?: string) => {
    clearInFlightGets();
    return request<T>(path, { method: 'DELETE', token });
  },

  uploadMedia: async (file: File, usage: MediaUsage, token: string): Promise<MediaUploadResponse> => {
    clearInFlightGets();
    // BOR-60: downscale/recompress images client-side before they ever leave
    // the device. Audio and non-image files pass through untouched, and any
    // compression failure falls back to the original file.
    const payload = file.type.startsWith('image/')
      ? await compressImageFile(file, maxEdgeForUsage(usage))
      : file;
    const formData = new FormData();
    formData.append('file', payload);
    formData.append('usage', usage);

    const response = await fetch(`${API_BASE_URL}/api/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },
};
