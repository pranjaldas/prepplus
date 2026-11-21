'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useToast } from '@/components/Toast';
import { LogIn } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { SubmitButton } from '@/components/SubmitButton';

export function LoginForm({ next, defaultEmail }: { next: string; defaultEmail: string }) {
  const [state, formAction] = useFormState(login, null);
  const toast = useToast();

  // Success redirects away (the welcome toast comes from a flash cookie).
  useEffect(() => {
    if (state && !state.ok) toast({ type: 'error', title: 'Login failed', message: state.error });
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state && !state.ok && <div className="alert-error">{state.error}</div>}

      <SubmitButton pendingText="Logging in…">
        <LogIn className="h-4 w-4" />
        Log in
      </SubmitButton>
    </form>
  );
}
