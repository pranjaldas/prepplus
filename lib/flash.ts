/** One-shot toast passed from a server action across a redirect via a short-lived cookie. */
export const FLASH_COOKIE = 'pp_flash';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastInput {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/** base64url(JSON) so names with any characters survive the cookie round trip. */
export function encodeFlash(toast: ToastInput): string {
  return Buffer.from(JSON.stringify(toast), 'utf8').toString('base64url');
}

export function decodeFlash(value: string): ToastInput | null {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (parsed && typeof parsed.title === 'string' && ['success', 'error', 'info'].includes(parsed.type)) {
      return { type: parsed.type, title: parsed.title, message: parsed.message };
    }
  } catch {
    // Malformed cookie: ignore.
  }
  return null;
}
