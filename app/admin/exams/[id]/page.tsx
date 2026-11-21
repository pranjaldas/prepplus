import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, CalendarClock, Clock, Users } from 'lucide-react';
import { DownloadPdfButton, ViewPdfButton } from '@/components/PdfButtons';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CopyButton } from '@/components/CopyButton';
import { formatDateTime, formatNumber, markingSummary } from '@/lib/format';
import type { Exam, ExamAttempt } from '@/lib/types';

export const metadata: Metadata = { title: 'Exam Results' };
export const dynamic = 'force-dynamic';

type AttemptRow = ExamAttempt & {
  profiles: { full_name: string; email: string } | null;
};

export default async function ExamResultsPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const supabase = createClient();
  const { data: exam } = await supabase.from('exams').select('*').eq('id', params.id).maybeSingle<Exam>();
  if (!exam) notFound();

  const { data: attemptsData } = await supabase
    .from('exam_attempts')
    .select('*, profiles(full_name, email)')
    .eq('exam_id', exam.id)
    .order('final_score', { ascending: false, nullsFirst: false });

  const attempts = (attemptsData ?? []) as AttemptRow[];
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const scores = submitted.map((a) => Number(a.final_score ?? 0));
  const avg = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;
  const top = scores.length ? Math.max(...scores) : null;
  const maxScore =
    submitted[0]?.total_questions != null
      ? submitted[0].total_questions * Number(exam.marks_per_question)
      : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-ink sm:text-2xl">{exam.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              <CopyButton value={exam.exam_code} />
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                Created {formatDateTime(exam.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {exam.duration_minutes} min
              </span>
              <span>{markingSummary(exam)}</span>
            </div>
          </div>
          <Link href={`/admin/exams/${exam.id}/review`} className="btn-primary shrink-0">
            <BookOpenCheck className="h-4 w-4" /> Review questions
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
          <Metric label="Appeared" value={String(attempts.length)} />
          <Metric label="Submitted" value={String(submitted.length)} />
          <Metric label="Average score" value={avg === null ? '—' : formatNumber(Math.round(avg * 100) / 100)} />
          <Metric
            label="Top score"
            value={top === null ? '—' : `${formatNumber(top)}${maxScore ? ` / ${formatNumber(maxScore)}` : ''}`}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-ink">Candidate scorecards</h2>
        </div>

        {attempts.length === 0 ? (
          <p className="px-5 py-12 text-center text-slate-500">No candidates have appeared for this exam yet.</p>
        ) : (
          <>
          {/* Phones: stacked cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {attempts.map((a) => (
              <li key={a.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words font-medium text-ink">{a.profiles?.full_name ?? 'Unknown'}</div>
                    <div className="break-all text-xs text-slate-500">{a.profiles?.email}</div>
                  </div>
                  {a.status === 'submitted' ? (
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold text-ink">{formatNumber(a.final_score)}</div>
                      <div className="text-xs text-slate-500">score</div>
                    </div>
                  ) : (
                    <span className="badge shrink-0 bg-amber-100 text-amber-800">In progress</span>
                  )}
                </div>
                {a.status === 'submitted' && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-success-light py-1.5 text-emerald-700">
                        <span className="block text-base font-bold">{a.right_count}</span>Right
                      </div>
                      <div className="rounded-lg bg-danger-light py-1.5 text-red-700">
                        <span className="block text-base font-bold">{a.wrong_count}</span>Wrong
                      </div>
                      <div className="rounded-lg bg-slate-100 py-1.5 text-slate-600">
                        <span className="block text-base font-bold">{a.unanswered_count}</span>Unanswered
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ViewPdfButton attemptId={a.id} label="View" className="btn-secondary py-2 text-xs" />
                      <DownloadPdfButton attemptId={a.id} label="PDF" className="btn-primary py-2 text-xs" />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          {/* Tablet & desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-3 py-3 text-center">Right</th>
                  <th className="px-3 py-3 text-center">Wrong</th>
                  <th className="px-3 py-3 text-center">Unanswered</th>
                  <th className="px-3 py-3 text-center">Final score</th>
                  <th className="px-5 py-3 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{a.profiles?.full_name ?? 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{a.profiles?.email}</div>
                    </td>
                    {a.status === 'submitted' ? (
                      <>
                        <td className="px-3 py-3 text-center font-semibold text-success">{a.right_count}</td>
                        <td className="px-3 py-3 text-center font-semibold text-danger">{a.wrong_count}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{a.unanswered_count}</td>
                        <td className="px-3 py-3 text-center font-bold text-ink">{formatNumber(a.final_score)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <ViewPdfButton attemptId={a.id} label="View" className="btn-secondary px-3 py-1.5 text-xs" />
                            <DownloadPdfButton attemptId={a.id} label="PDF" className="btn-primary px-3 py-1.5 text-xs" />
                          </div>
                        </td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-3 py-3 text-center">
                        <span className="badge bg-amber-100 text-amber-800">In progress</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-indigo-50/60 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-ink">{value}</div>
    </div>
  );
}
