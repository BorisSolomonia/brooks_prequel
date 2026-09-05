export type PushPermissionStatus = 'unknown' | 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

export const PUSH_PERMISSION_REQUEST_EVENT = 'brooks:push-permission-request';
export const PUSH_PERMISSION_STATUS_EVENT = 'brooks:push-permission-status';
export const PUSH_PERMISSION_STATUS_KEY = 'brooks.pushPermission.v1';

export function readPushPermissionStatus(): PushPermissionStatus {
  if (typeof window === 'undefined') return 'unknown';
  const value = window.localStorage.getItem(PUSH_PERMISSION_STATUS_KEY);
  return value === 'prompt' || value === 'prompt-with-rationale' || value === 'granted' || value === 'denied'
    ? value
    : 'unknown';
}

export function publishPushPermissionStatus(status: PushPermissionStatus): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PUSH_PERMISSION_STATUS_KEY, status);
  window.dispatchEvent(new CustomEvent(PUSH_PERMISSION_STATUS_EVENT, { detail: status }));
}

export function requestPushPermission(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PUSH_PERMISSION_REQUEST_EVENT));
}
