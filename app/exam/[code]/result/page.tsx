import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarCheck2, User } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ScoreSummary } from '@/components/ScoreSummary';
import { requireProfile } from '@/lib/auth';
import { loadExamForCandidate } from '@/lib/examContext';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFullSheetData, SheetError } from '@/lib/googleSheets';
import { sanitiseAnswers } from '@/lib/grading';
import { formatDateTime, markingSummary } from '@/lib/format';
import type { AnswersMap, FullQuestion } from '@/lib/types';
import { AnswerReview } from './AnswerReview';

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

  // The attempt is submitted, so it's now safe to reveal answers and explanations.
  // Both reads are scoped to this candidate's own attempt.
  let questions: FullQuestion[] = [];
  let answers: AnswersMap = {};
  let reviewError: string | null = null;
  try {
    const admin = createAdminClient();
    const [sheet, { data: answerRow }] = await Promise.all([
      getFullSheetData(exam.sheet_url),
      admin.from('candidate_answers').select('answers_json').eq('attempt_id', attempt.id).maybeSingle(),
    ]);
    questions = sheet;
    answers = sanitiseAnswers(answerRow?.answers_json ?? {}, sheet.length);
  } catch (err) {
    reviewError =
      err instanceof SheetError
        ? `The answer review is temporarily unavailable: ${err.message}`
        : 'The answer review could not be loaded right now. Please try again in a moment.';
  }

  return (
    <>
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div>
          <p className="font-mono text-sm text-slate-500">{exam.exam_code}</p>
          <h1 className="break-words text-xl font-bold text-ink sm:text-2xl">{exam.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" /> {profile.full_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck2 className="h-4 w-4" /> Submitted {formatDateTime(attempt.submitted_at)}
            </span>
            <span>{markingSummary(exam)}</span>
          </p>
        </div>

        <ScoreSummary
          total={total}
          right={attempt.right_count ?? 0}
          wrong={attempt.wrong_count ?? 0}
          unanswered={attempt.unanswered_count ?? 0}
          score={Number(attempt.final_score ?? 0)}
          maxScore={maxScore}
        />

        {reviewError ? (
          <div className="alert-error flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{reviewError}</span>
          </div>
        ) : (
          <AnswerReview questions={questions} answers={answers} />
        )}
      </main>
    </>
  );
}
