import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <Logo />
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="text-slate-500">The page or exam you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </div>
  );
}
