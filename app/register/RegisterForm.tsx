'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useToast } from '@/components/Toast';
import { CheckCircle2, KeyRound, UserPlus } from 'lucide-react';
import { registerCandidate } from '@/app/actions/auth';
import { SubmitButton } from '@/components/SubmitButton';
import { CopyButton } from '@/components/CopyButton';

export function RegisterForm() {
  const [state, formAction] = useFormState(registerCandidate, null);
  const toast = useToast();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast({
        type: 'success',
        title: 'Account created!',
        message: 'Save your generated password before continuing to login.',
        duration: 6000,
      });
    } else {
      toast({ type: 'error', title: 'Registration failed', message: state.error });
    }
  }, [state, toast]);

  if (state?.ok) {
    const { email, password, fullName } = state.data;
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg bg-success-light p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            Welcome, <strong>{fullName}</strong>! Your account for <strong>{email}</strong> is ready.
          </div>
        </div>

        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-indigo-50 p-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium text-ink">
            <KeyRound className="h-4 w-4 text-primary" /> Your generated password
          </div>
          <div className="font-mono text-3xl font-bold tracking-wider text-ink">{password}</div>
          <div className="mt-3">
            <CopyButton value={password} label="Copy password" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Save this password now. It&apos;s the first 4 characters of your email followed by the first
            4 letters of your name, in lowercase.
          </p>
        </div>

        <Link href={`/login?email=${encodeURIComponent(email)}`} className="btn-primary w-full">
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="label">
          Full name
        </label>
        <input id="fullName" name="fullName" required className="input" placeholder="Asha Verma" />
      </div>
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
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          className="input"
          placeholder="+91 98765 43210"
        />
      </div>

      {state && !state.ok && <div className="alert-error">{state.error}</div>}

      <SubmitButton pendingText="Creating account…">
        <UserPlus className="h-4 w-4" />
        Register
      </SubmitButton>
    </form>
  );
}
