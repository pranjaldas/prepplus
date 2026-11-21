import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { loadExamForCandidate } from '@/lib/examContext';
import { getSanitizedQuestions, SheetError } from '@/lib/googleSheets';
import { attemptDeadline } from '@/lib/format';
import type { SanitizedQuestion } from '@/lib/types';
import { LiveExam } from './LiveExam';

export const metadata: Metadata = { title: 'Live Exam' };
export const dynamic = 'force-dynamic';

export default async function LiveExamPage({ params }: { params: { code: string } }) {
  const profile = await requireProfile();
  const { code, exam, attempt } = await loadExamForCandidate(params.code, profile.id);

  if (!exam) notFound();
  const encoded = encodeURIComponent(code);
  if (!attempt) redirect(`/exam/${encoded}/instructions`);
  if (attempt.status === 'submitted') redirect(`/exam/${encoded}/result`);

  // Sanitised: correct_option and note never reach the browser.
  let questions: SanitizedQuestion[];
  try {
    questions = await getSanitizedQuestions(exam.sheet_url);
  } catch (err) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-danger" />
          <h1 className="text-lg font-bold text-ink">Questions could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-600">
            {err instanceof SheetError ? err.message : 'Please check your connection and try again.'} Your timer
            is still running and your saved answers are kept on this device.
          </p>
          <Link href={`/exam/${encoded}/live`} className="btn-primary mt-6">
            Retry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LiveExam
      code={code}
      attemptId={attempt.id}
      examTitle={exam.title}
      candidateName={profile.full_name}
      questions={questions}
      deadline={attemptDeadline(attempt.started_at, exam.duration_minutes)}
      serverNow={Date.now()}
    />
  );
}
