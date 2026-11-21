import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCcwDot,
  Sparkles,
  Timer,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { requireProfile } from '@/lib/auth';
import { loadExamForCandidate } from '@/lib/examContext';
import { getSanitizedQuestions, SheetError } from '@/lib/googleSheets';
import { attemptDeadline, formatNumber } from '@/lib/format';
import { StartExamButton } from './StartExamButton';

export const metadata: Metadata = { title: 'Exam Instructions' };
export const dynamic = 'force-dynamic';

export default async function InstructionsPage({ params }: { params: { code: string } }) {
  const profile = await requireProfile();
  const { code, exam, attempt } = await loadExamForCandidate(params.code, profile.id);

  return (
    <>
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <Content />
      </main>
    </>
  );

  async function Content() {
    if (!exam) {
      return (
        <Blocker
          icon={<Ban className="h-8 w-8" />}
          title="Exam not found"
          text={`There is no exam with the code ${code}. Please check the code and try again.`}
        />
      );
    }

    if (attempt?.status === 'submitted') {
      return (
        <Blocker
          icon={<CheckCircle2 className="h-8 w-8" />}
          tone="success"
          title="You have already completed this exam"
          text="Each exam can only be attempted once. You can review your scorecard below."
          action={
            <Link href={`/exam/${encodeURIComponent(code)}/result`} className="btn-primary">
              View scorecard
            </Link>
          }
        />
      );
    }

    if (exam.status !== 'active') {
      return <Blocker icon={<Ban className="h-8 w-8" />} title="Exam closed" text="This exam is no longer accepting candidates." />;
    }

    let totalQuestions: number;
    try {
      totalQuestions = (await getSanitizedQuestions(exam.sheet_url)).length;
    } catch (err) {
      return (
        <Blocker
          icon={<AlertTriangle className="h-8 w-8" />}
          title="Exam temporarily unavailable"
          text={err instanceof SheetError ? err.message : 'Questions could not be loaded. Please try again shortly.'}
        />
      );
    }

    const resuming = attempt?.status === 'in_progress';
    const expired =
      attempt?.status === 'in_progress' &&
      Date.now() >= attemptDeadline(attempt.started_at, exam.duration_minutes);
    const negative = exam.is_negative_marking && Number(exam.negative_mark) > 0;

    return (
      <div className="card overflow-hidden">
        <div className="bg-ink px-5 py-5 text-white sm:px-8 sm:py-6">
          <p className="font-mono text-sm text-indigo-200">{exam.exam_code}</p>
          <h1 className="mt-1 text-2xl font-bold">{exam.title}</h1>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact icon={<ListChecks className="h-5 w-5" />} label="Questions" value={String(totalQuestions)} />
            <Fact icon={<Clock className="h-5 w-5" />} label="Duration" value={`${exam.duration_minutes} min`} />
            <Fact
              icon={<Sparkles className="h-5 w-5" />}
              label="Per correct"
              value={`+${formatNumber(exam.marks_per_question)}`}
            />
            <Fact
              icon={<RefreshCcwDot className="h-5 w-5" />}
              label="Per wrong"
              value={negative ? `-${formatNumber(exam.negative_mark)}` : '0'}
              danger={negative}
            />
          </div>

          {negative && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-danger-light p-4 text-sm text-red-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <strong>Negative marking is ON.</strong> Each wrong answer deducts{' '}
                {formatNumber(exam.negative_mark)} mark(s). Unanswered questions are not penalised, so avoid
                guessing blindly.
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-semibold text-ink">Instructions</h2>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <Rule icon={<Ban className="h-4 w-4 text-danger" />}>
                <strong>Do not refresh or close the browser window</strong> during the exam.
              </Rule>
              <Rule icon={<Timer className="h-4 w-4 text-primary" />}>
                The timer starts as soon as you click Start Exam.{' '}
                <strong>The exam auto-submits when the timer ends.</strong>
              </Rule>
              <Rule icon={<ListChecks className="h-4 w-4 text-primary" />}>
                One question is shown at a time. Use the question palette to jump between questions; answered
                questions are marked green.
              </Rule>
              <Rule icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                Each question has exactly one correct option. You can change or clear your answer any time before
                submitting.
              </Rule>
              <Rule icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
                You can attempt this exam only once.
              </Rule>
            </ul>
          </div>

          <p className="text-center text-lg font-semibold text-ink">Best of luck! 🍀</p>

          <StartExamButton code={code} resuming={resuming} expired={!!expired} />
        </div>
      </div>
    );
  }
}

function Fact({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-indigo-50/70 p-4 text-center">
      <div className={`mx-auto mb-1 inline-flex ${danger ? 'text-danger' : 'text-primary'}`}>{icon}</div>
      <div className={`text-xl font-bold ${danger ? 'text-danger' : 'text-ink'}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Rule({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function Blocker({
  icon,
  title,
  text,
  action,
  tone = 'danger',
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
  tone?: 'danger' | 'success';
}) {
  return (
    <div className="card p-6 text-center sm:p-10">
      <div
        className={`mx-auto mb-4 inline-flex rounded-full p-4 ${
          tone === 'success' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
        }`}
      >
        {icon}
      </div>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
