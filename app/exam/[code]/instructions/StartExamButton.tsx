'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle } from 'lucide-react';
import { startExam } from '@/app/actions/attempts';

export function StartExamButton({
  code,
  resuming,
  expired,
}: {
  code: string;
  resuming: boolean;
  expired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agreed, setAgreed] = useState(resuming);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    if (resuming) {
      // Inside a transition so the button shows a spinner until the exam has loaded.
      startTransition(() => router.push(`/exam/${encodeURIComponent(code)}/live`));
      return;
    }
    startTransition(async () => {
      // On success the action redirects to the live exam.
      const res = await startExam(code);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {!resuming && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          I have read and understood the instructions. I am ready to begin.
        </label>
      )}

      {resuming && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          {expired
            ? 'Your time for this exam has run out. Continue to submit your saved answers and see your result.'
            : 'You already started this exam. The timer kept running while you were away. Resume now.'}
        </div>
      )}

      {error && <div className="alert-error">{error}</div>}

      <button type="button" onClick={start} disabled={!agreed || pending} className="btn-success w-full py-3 text-base">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
        {pending
          ? resuming
            ? 'Loading exam…'
            : 'Starting exam…'
          : resuming
            ? expired
              ? 'Submit & view result'
              : 'Resume Exam'
            : 'Start Exam'}
      </button>
    </div>
  );
}
