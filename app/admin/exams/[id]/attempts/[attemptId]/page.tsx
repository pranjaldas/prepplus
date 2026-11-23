import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarCheck2, Clock, Mail, Phone, User } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFullSheetData, SheetError } from '@/lib/googleSheets';
import { sanitiseAnswers } from '@/lib/grading';
import { formatDateTime, markingSummary } from '@/lib/format';
import { ScoreSummary } from '@/components/ScoreSummary';
import { AnswerReview } from '@/components/AnswerReview';
import type { AnswersMap, Exam, ExamAttempt, FullQuestion, Profile } from '@/lib/types';

export const metadata: Metadata = { title: 'Candidate Report' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CandidateReportPage({
  params,
}: {
  params: { id: string; attemptId: string };
}) {
  await requireAdmin();
  if (!UUID.test(params.id) || !UUID.test(params.attemptId)) notFound();

  // RLS lets admins read every exam, attempt, profile and answer row.
  const supabase = createClient();
  const [{ data: exam }, { data: attempt }] = await Promise.all([
    supabase.from('exams').select('*').eq('id', params.id).maybeSingle<Exam>(),
    supabase.from('exam_attempts').select('*').eq('id', params.attemptId).maybeSingle<ExamAttempt>(),
  ]);
  if (!exam || !attempt || attempt.exam_id !== exam.id) notFound();

  const [{ data: candidate }, { data: answerRow }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', attempt.candidate_id).maybeSingle<Profile>(),
    supabase.from('candidate_answers').select('answers_json').eq('attempt_id', attempt.id).maybeSingle(),
  ]);

  const submitted = attempt.status === 'submitted';
  const total = attempt.total_questions ?? 0;
  const maxScore = total * Number(exam.marks_per_question);

  let questions: FullQuestion[] = [];
  let answers: AnswersMap = {};
  let reviewError: string | null = null;
  if (submitted) {
    try {
      questions = await getFullSheetData(exam.sheet_url);
      answers = sanitiseAnswers(answerRow?.answers_json ?? {}, questions.length);
    } catch (err) {
      reviewError =
        err instanceof SheetError
          ? `The answer review is unavailable: ${err.message}`
          : 'The answer review could not be loaded from the Google Sheet. Please try again.';
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/admin/exams/${exam.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam results
      </Link>

      {/* Candidate + exam details */}
      <div className="card overflow-hidden">
        <div className="bg-ink px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Candidate report</p>
          <h1 className="mt-1 flex items-center gap-2 break-words text-xl font-bold sm:text-2xl">
            <User className="h-5 w-5 shrink-0 text-indigo-300" />
            {candidate?.full_name ?? 'Unknown candidate'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-indigo-100">
            {candidate?.email && (
              <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                <Mail className="h-4 w-4 shrink-0 text-indigo-300" /> {candidate.email}
              </span>
            )}
            {candidate?.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-indigo-300" /> {candidate.phone}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2 p-5 text-sm text-slate-600 sm:p-6">
          <p className="break-words text-base font-semibold text-ink">
            {exam.title} <span className="ml-1 font-mono text-sm font-normal text-slate-500">{exam.exam_code}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" /> Started {formatDateTime(attempt.started_at)}
            </span>
            {submitted && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck2 className="h-4 w-4 text-slate-400" /> Submitted {formatDateTime(attempt.submitted_at)}
              </span>
            )}
            <span>{markingSummary(exam)}</span>
          </p>
        </div>
      </div>

      {!submitted ? (
        <div className="card p-10 text-center">
          <span className="badge bg-amber-100 text-amber-800">In progress</span>
          <p className="mt-3 text-sm text-slate-600">
            This candidate hasn&apos;t submitted the exam yet. Their report appears here once they submit.
          </p>
        </div>
      ) : (
        <>
          <ScoreSummary
            total={total}
            right={attempt.right_count ?? 0}
            wrong={attempt.wrong_count ?? 0}
            unanswered={attempt.unanswered_count ?? 0}
            score={Number(attempt.final_score ?? 0)}
            maxScore={maxScore}
            subject="candidate"
          />
          {reviewError ? (
            <div className="alert-error flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{reviewError}</span>
            </div>
          ) : (
            <AnswerReview questions={questions} answers={answers} subject="candidate" />
          )}
        </>
      )}
    </div>
  );
}
