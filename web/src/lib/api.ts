import type { MediaUploadResponse, MediaUsage } from '@/types';
import { compressImageFile, maxEdgeForUsage } from '@/lib/imageCompression';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface RequestOptions extends RequestInit {
  token?: string;
  timeoutMs?: number;
}

export interface ApiGetOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

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

function getRequest<T>(path: string, token?: string, options: ApiGetOptions = {}): Promise<T> {
  // A caller-owned signal usually means request ordering matters (for example,
  // map viewport fetches). Such requests must not share another caller's promise.
  if (options.signal || options.timeoutMs !== undefined) {
    return request<T>(path, { method: 'GET', token, ...options });
  }

  const key = requestIdentity(path, token);
  const existing = inFlightGets.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = request<T>(path, { method: 'GET', token, ...options });
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

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    token,
    headers: customHeaders,
    signal: callerSignal,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) {
    controller.abort();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      ...rest,
    });
    if (!response.ok) {
      const error = await response.json().catch((error: unknown) => {
        if (controller.signal.aborted) throw error;
        return { detail: 'An error occurred' };
      });
      throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
    }
    if (response.status === 204) return undefined as T;
    // Keep timeout and caller cancellation active until the body is consumed.
    return await response.json();
  } catch (error) {
    if (timedOut) {
      throw new ApiError('Request timed out. Check your connection and try again.', 408);
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }

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
  get: <T>(path: string, token?: string, options?: ApiGetOptions) =>
    getRequest<T>(path, token, options),

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
