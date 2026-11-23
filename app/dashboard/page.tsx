import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, Eye, PlayCircle } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { ExamAttempt } from '@/lib/types';
import { JoinExamCard } from './JoinExamCard';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

type HistoryRow = ExamAttempt & {
  exams: { title: string; exam_code: string; marks_per_question: number } | null;
};

export default async function CandidateDashboardPage() {
  const profile = await requireProfile();

  // Service-role read scoped to this candidate, so the exam's sheet_url never
  // has to be readable by candidates through RLS.
  const admin = createAdminClient();
  const { data } = await admin
    .from('exam_attempts')
    .select('*, exams(title, exam_code, marks_per_question)')
    .eq('candidate_id', profile.id)
    .order('started_at', { ascending: false });

  const history = (data ?? []) as HistoryRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Hi, {profile.full_name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500">Enter an exam code to begin, or review your past attempts.</p>
      </div>

      <JoinExamCard />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">Your exam history</h2>
        </div>

        {history.length === 0 ? (
          <div className="card px-6 py-12 text-center text-slate-500">
            You haven&apos;t attempted any exams yet. Your results will appear here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {history.map((a) => {
              const code = a.exams?.exam_code ?? '';
              const max =
                a.total_questions != null && a.exams
                  ? a.total_questions * Number(a.exams.marks_per_question)
                  : null;
              return (
                <div key={a.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink">{a.exams?.title ?? 'Exam'}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{code}</span> · {formatDateTime(a.submitted_at ?? a.started_at)}
                      </p>
                    </div>
                    {a.status === 'submitted' ? (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-ink">{formatNumber(a.final_score)}</div>
                        {max != null && <div className="text-xs text-slate-500">of {formatNumber(max)}</div>}
                      </div>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-800">In progress</span>
                    )}
                  </div>

                  {a.status === 'submitted' ? (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-lg bg-success-light py-2">
                          <div className="font-bold text-emerald-700">{a.right_count}</div>
                          <div className="text-xs text-emerald-700">Right</div>
                        </div>
                        <div className="rounded-lg bg-danger-light py-2">
                          <div className="font-bold text-red-700">{a.wrong_count}</div>
                          <div className="text-xs text-red-700">Wrong</div>
                        </div>
                        <div className="rounded-lg bg-slate-100 py-2">
                          <div className="font-bold text-slate-600">{a.unanswered_count}</div>
                          <div className="text-xs text-slate-600">Unanswered</div>
                        </div>
                      </div>
                      <Link href={`/exam/${encodeURIComponent(code)}/result`} className="btn-primary mt-4 w-full">
                        <Eye className="h-4 w-4" /> View Scorecard &amp; Answers
                      </Link>
                    </>
                  ) : (
                    <Link href={`/exam/${encodeURIComponent(code)}/instructions`} className="btn-primary mt-4">
                      <PlayCircle className="h-4 w-4" /> Resume exam
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
