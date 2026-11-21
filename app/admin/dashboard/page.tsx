import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ClipboardList, Inbox, PlusCircle, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CopyButton } from '@/components/CopyButton';
import { formatDateTime, markingSummary } from '@/lib/format';
import type { Exam } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin Dashboard' };
export const dynamic = 'force-dynamic';

type ExamWithCount = Exam & { exam_attempts: { count: number }[] };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('exams')
    .select('*, exam_attempts(count)')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="alert-error">Could not load exams: {error.message}</div>;
  }

  const exams = (data ?? []) as ExamWithCount[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink">Exams</h1>
          <p className="text-sm text-slate-500">Create exams, share codes and review candidate results.</p>
        </div>
        <Link href="/admin/exams/create" className="btn-primary">
          <PlusCircle className="h-4 w-4" />
          Create Exam
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-ink">All exams</h2>
          <span className="badge bg-slate-100 text-slate-600">{exams.length}</span>
        </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-slate-500">
            <Inbox className="h-10 w-10 text-slate-300" />
            <p>No exams yet.</p>
            <Link href="/admin/exams/create" className="mt-2 text-sm font-semibold text-primary hover:underline">
              Create your first exam
            </Link>
          </div>
        ) : (
          <>
          {/* Phones: stacked cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {exams.map((exam) => {
              const negative = exam.is_negative_marking && Number(exam.negative_mark) > 0;
              return (
                <li key={exam.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-ink">{exam.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Created {formatDateTime(exam.created_at)}</p>
                    </div>
                    <CopyButton value={exam.exam_code} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{exam.duration_minutes} min</span>
                    <span className={negative ? 'text-danger' : ''}>{markingSummary(exam)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-medium text-ink">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {exam.exam_attempts?.[0]?.count ?? 0} appeared
                    </span>
                    <Link href={`/admin/exams/${exam.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                      View results <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablet & desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Exam</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Marking</th>
                  <th className="px-3 py-3 text-center">Candidates</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Created</th>
                  <th className="px-5 py-3 text-right">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => {
                  const negative = exam.is_negative_marking && Number(exam.negative_mark) > 0;
                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{exam.title}</div>
                        {exam.status !== 'active' && (
                          <span className="badge mt-1 bg-slate-100 text-slate-600">{exam.status}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <CopyButton value={exam.exam_code} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">{exam.duration_minutes} min</td>
                      <td className={`px-3 py-3 ${negative ? 'text-danger' : 'text-slate-600'}`}>
                        {markingSummary(exam)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 font-medium text-ink">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {exam.exam_attempts?.[0]?.count ?? 0}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{formatDateTime(exam.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/exams/${exam.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
