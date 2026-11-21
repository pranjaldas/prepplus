'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { FLASH_COOKIE, decodeFlash, type ToastInput, type ToastType } from '@/lib/flash';

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const STYLES: Record<ToastType, { icon: React.ElementType; bar: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-success', iconColor: 'text-success' },
  error: { icon: AlertCircle, bar: 'bg-danger', iconColor: 'text-danger' },
  info: { icon: Info, bar: 'bg-primary', iconColor: 'text-primary' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const pathname = usePathname();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? 4500);
    },
    [dismiss],
  );

  // Show a flash message left by a server action before it redirected.
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${FLASH_COOKIE}=([^;]*)`));
    if (!match) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
    const flash = decodeFlash(match[1]);
    if (flash) show(flash);
  }, [pathname, show]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => {
          const { icon: Icon, bar, iconColor } = STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto relative flex w-full max-w-sm animate-toast-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <span className={`w-1.5 shrink-0 ${bar}`} />
              <div className="flex flex-1 items-start gap-3 p-4">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-sm text-slate-600">{t.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
