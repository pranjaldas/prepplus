import { LogoMark } from './Logo';

/** Full-area loader shown by route-level loading.tsx files while a page is fetched. */
export function PageLoader({
  title = 'Loading…',
  subtitle,
  fullScreen = false,
}: {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 px-4 text-center ${
        fullScreen ? 'min-h-screen bg-slate-50' : 'py-24'
      }`}
    >
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
        <LogoMark size={56} className="relative" />
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full w-1/3 animate-loader-bar rounded-full bg-gradient-to-r from-primary to-success" />
      </div>
    </div>
  );
}
