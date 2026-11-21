import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; email?: string };
}) {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to PrepPulse.">
      <LoginForm next={searchParams.next ?? ''} defaultEmail={searchParams.email ?? ''} />
      <p className="mt-6 text-center text-sm text-slate-600">
        New candidate?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
