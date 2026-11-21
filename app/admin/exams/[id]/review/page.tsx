import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, ExternalLink, ListChecks } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFullSheetData, SheetError } from '@/lib/googleSheets';
import { CopyButton } from '@/components/CopyButton';
import { markingSummary } from '@/lib/format';
import { OPTION_KEYS, type Exam, type FullQuestion } from '@/lib/types';

export const metadata: Metadata = { title: 'Review Questions' };
export const dynamic = 'force-dynamic';

const LETTERS = ['A', 'B', 'C', 'D'];

export default async function ReviewQuestionsPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  // RLS: only admins can read exams, so sheet_url never reaches candidates.
  const supabase = createClient();
  const { data: exam } = await supabase.from('exams').select('*').eq('id', params.id).maybeSingle<Exam>();
  if (!exam) notFound();

  let questions: FullQuestion[] = [];
  let loadError: string | null = null;
  try {
    questions = await getFullSheetData(exam.sheet_url);
  } catch (err) {
    loadError = err instanceof SheetError ? err.message : 'Could not load questions from the Google Sheet.';
  }

  const unresolved = questions.filter((q) => !q.correct_key).map((q) => q.index);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/admin/exams/${exam.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exam results
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="bg-ink px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Question review</p>
          <h1 className="mt-1 break-words text-xl font-bold sm:text-2xl">{exam.title}</h1>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <CopyButton value={exam.exam_code} />
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-slate-400" />
              {questions.length} questions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              {exam.duration_minutes} min
            </span>
            <span>{markingSummary(exam)}</span>
          </div>
          <a
            href={exam.sheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Google Sheet
          </a>
        </div>
      </div>

      {loadError && (
        <div className="alert-error flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {unresolved.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Question(s) {unresolved.join(', ')} have a <code>correct_option</code> value that doesn&apos;t match any
            option, so every answer to them is marked wrong. Fix them in the Google Sheet.
          </span>
        </div>
      )}

      {/* Questions */}
      <ol className="space-y-4">
        {questions.map((q) => {
          const correctIdx = q.correct_key ? OPTION_KEYS.indexOf(q.correct_key) : -1;
          return (
            <li key={q.index} className="card p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="badge bg-indigo-50 font-semibold text-ink">Question {q.index}</span>
                {correctIdx < 0 && (
                  <span className="badge bg-amber-100 text-amber-800">
                    <AlertTriangle className="h-3 w-3" /> No valid answer
                  </span>
                )}
              </div>

              <p className="whitespace-pre-wrap break-words font-medium leading-relaxed text-slate-900">
                {q.question}
              </p>

              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => {
                  const isCorrect = i === correctIdx;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                        isCorrect
                          ? 'border-success bg-success-light text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                          isCorrect ? 'bg-success text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {LETTERS[i]}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5">{opt}</span>
                      {isCorrect && (
                        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="hidden sm:inline">CORRECT</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-sm text-slate-600">
                Correct answer:{' '}
                <span className="font-semibold text-emerald-700">
                  {correctIdx >= 0 ? `${LETTERS[correctIdx]}. ${q.options[correctIdx]}` : q.correct_option || '—'}
                </span>
              </p>
            </li>
          );
        })}
      </ol>

      {!loadError && questions.length === 0 && (
        <div className="card p-10 text-center text-slate-500">This sheet has no questions.</div>
      )}
    </div>
  );
}
