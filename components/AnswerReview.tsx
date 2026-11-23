'use client';

import { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { ReviewQuestionCard, reviewStatus, type ReviewStatus } from '@/components/ReviewQuestionCard';
import type { AnswersMap, FullQuestion } from '@/lib/types';

type Filter = 'all' | ReviewStatus;

const FILTERS: { key: Filter; label: string; active: string }[] = [
  { key: 'all', label: 'All', active: 'bg-ink text-white' },
  { key: 'correct', label: 'Correct', active: 'bg-success text-white' },
  { key: 'wrong', label: 'Wrong', active: 'bg-danger text-white' },
  { key: 'unanswered', label: 'Unanswered', active: 'bg-slate-600 text-white' },
];

export function AnswerReview({
  questions,
  answers,
  subject = 'you',
}: {
  questions: FullQuestion[];
  answers: AnswersMap;
  /** "you" on the candidate's own scorecard, "candidate" when an admin views it. */
  subject?: 'you' | 'candidate';
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const withStatus = useMemo(
    () => questions.map((q) => ({ q, status: reviewStatus(q, answers[String(q.index)]) })),
    [questions, answers],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: withStatus.length, correct: 0, wrong: 0, unanswered: 0 };
    for (const { status } of withStatus) c[status] += 1;
    return c;
  }, [withStatus]);
  const visible = filter === 'all' ? withStatus : withStatus.filter((x) => x.status === filter);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <ListChecks className="h-5 w-5 text-primary" /> Question-by-question review
        </h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f.key ? f.active : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label} <span className="ml-1 opacity-80">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No questions in this category.</div>
      ) : (
        <ol className="space-y-4">
          {visible.map(({ q }) => (
            <ReviewQuestionCard
              key={q.index}
              question={q}
              mode="candidate"
              selected={answers[String(q.index)]}
              subject={subject}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
