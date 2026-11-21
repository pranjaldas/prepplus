import Link from 'next/link';
import { LayoutDashboard, PlusCircle } from 'lucide-react';
import { Logo } from './Logo';
import { LogoutButton } from './LogoutButton';
import type { Profile } from '@/lib/types';

export function AppHeader({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'}>
          <Logo light size={34} />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {isAdmin ? (
            <>
              <Link href="/admin/dashboard" className="nav-link">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Exams</span>
              </Link>
              <Link href="/admin/exams/create" className="nav-link">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Create Exam</span>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="nav-link">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}

          <span className="mx-2 hidden h-6 w-px bg-white/20 md:block" />
          <span className="hidden text-sm text-indigo-200 md:block">{profile.full_name}</span>

          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
