'use client';

import { useFormStatus } from 'react-dom';
import { Loader2, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="nav-link disabled:opacity-70" aria-label="Log out">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="hidden sm:inline">{pending ? 'Logging out…' : 'Logout'}</span>
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <Inner />
    </form>
  );
}
