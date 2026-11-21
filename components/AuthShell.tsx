import Link from 'next/link';
import { Logo } from './Logo';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink via-ink-light to-ink px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Logo light size={44} />
          </Link>
          <p className="mt-2 text-sm italic text-indigo-200">Precision Mock Exams &amp; Instant Insights</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
