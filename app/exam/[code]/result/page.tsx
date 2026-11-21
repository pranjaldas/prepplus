import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CalendarCheck2 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { DownloadPdfButton, ViewPdfButton } from '@/components/PdfButtons';
import { ScoreSummary } from '@/components/ScoreSummary';
import { requireProfile } from '@/lib/auth';
import { loadExamForCandidate } from '@/lib/examContext';
import { formatDateTime, markingSummary } from '@/lib/format';

export const metadata: Metadata = { title: 'Scorecard' };
export const dynamic = 'force-dynamic';

export default async function ResultPage({ params }: { params: { code: string } }) {
  const profile = await requireProfile();
  const { code, exam, attempt } = await loadExamForCandidate(params.code, profile.id);

  if (!exam) notFound();
  const encoded = encodeURIComponent(code);
  if (!attempt) redirect(`/exam/${encoded}/instructions`);
  if (attempt.status !== 'submitted') redirect(`/exam/${encoded}/live`);

  const total = attempt.total_questions ?? 0;
  const maxScore = total * Number(exam.marks_per_question);

  return (
    <>
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-sm text-slate-500">{exam.exam_code}</p>
            <h1 className="break-words text-xl font-bold text-ink sm:text-2xl">{exam.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck2 className="h-4 w-4" /> Submitted {formatDateTime(attempt.submitted_at)}
              </span>
              <span>{markingSummary(exam)}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
            <ViewPdfButton attemptId={attempt.id} />
            <DownloadPdfButton attemptId={attempt.id} />
          </div>
        </div>

        <ScoreSummary
          total={total}
          right={attempt.right_count ?? 0}
          wrong={attempt.wrong_count ?? 0}
          unanswered={attempt.unanswered_count ?? 0}
          score={Number(attempt.final_score ?? 0)}
          maxScore={maxScore}
        />

        <p className="text-center text-sm text-slate-500">
          The PDF review includes every question, your answer, the correct answer and an explanation.
        </p>
      </main>
    </>
  );
}
