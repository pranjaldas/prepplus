'use client';

import { useFormState } from 'react-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { joinExam } from '@/app/actions/attempts';
import { SubmitButton } from '@/components/SubmitButton';

export function JoinExamCard() {
  const [state, formAction] = useFormState(joinExam, null);

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-ink-light p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
            <KeyRound className="h-3.5 w-3.5" /> Join Exam
          </div>
          <h2 className="text-2xl font-bold">Ready for your mock exam?</h2>
          <p className="mt-1 text-sm text-indigo-200">Enter the exam code shared by your instructor.</p>
        </div>

        <form action={formAction} className="w-full md:max-w-md">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="code"
              required
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              placeholder="PP-4K9Z"
              className="input flex-1 border-transparent font-mono text-lg uppercase tracking-widest"
            />
            <SubmitButton className="btn-primary px-6" pendingText="Checking…">
              Join <ArrowRight className="h-4 w-4" />
            </SubmitButton>
          </div>
          {state && !state.ok && (
            <p className="mt-2 rounded-md bg-danger/20 px-3 py-2 text-sm text-red-100">{state.error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
