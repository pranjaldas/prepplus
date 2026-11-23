import { AlertTriangle, CheckCircle2, CircleDashed, Lightbulb, XCircle } from 'lucide-react';
import { OPTION_KEYS, type FullQuestion, type OptionKey } from '@/lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];

export type ReviewStatus = 'correct' | 'wrong' | 'unanswered';

export function reviewStatus(q: FullQuestion, selected: OptionKey | undefined): ReviewStatus {
  if (!selected) return 'unanswered';
  return q.correct_key && selected === q.correct_key ? 'correct' : 'wrong';
}

const PILL: Record<ReviewStatus, { label: string; className: string; icon: React.ElementType }> = {
  correct: { label: 'Correct', className: 'bg-success-light text-emerald-700', icon: CheckCircle2 },
  wrong: { label: 'Wrong', className: 'bg-danger-light text-red-700', icon: XCircle },
  unanswered: { label: 'Unanswered', className: 'bg-slate-100 text-slate-600', icon: CircleDashed },
};

/**
 * One question in review mode. `mode="candidate"` shows the candidate's answer
 * (green if right, red if wrong) and the explanation, like a printed scorecard.
 * `mode="admin"` shows only the question, options and the correct answer.
 */
export function ReviewQuestionCard({
  question: q,
  mode,
  selected,
  subject = 'you',
}: {
  question: FullQuestion;
  mode: 'candidate' | 'admin';
  selected?: OptionKey;
  /** Wording for the chosen answer: "Your answer" vs "Candidate's answer". */
  subject?: 'you' | 'candidate';
}) {
  const isCandidate = mode === 'candidate';
  const answerLabel = subject === 'you' ? 'Your answer' : "Candidate's answer";
  const correctIdx = q.correct_key ? OPTION_KEYS.indexOf(q.correct_key) : -1;
  const selectedIdx = selected ? OPTION_KEYS.indexOf(selected) : -1;
  const status = reviewStatus(q, selected);
  const pill = PILL[status];

  return (
    <li className="card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="badge bg-indigo-50 font-semibold text-ink">Question {q.index}</span>
        {isCandidate ? (
          <span className={`badge font-semibold ${pill.className}`}>
            <pill.icon className="h-3.5 w-3.5" /> {pill.label}
          </span>
        ) : (
          correctIdx < 0 && (
            <span className="badge bg-amber-100 text-amber-800">
              <AlertTriangle className="h-3 w-3" /> No valid answer
            </span>
          )
        )}
      </div>

      <p className="whitespace-pre-wrap break-words font-medium leading-relaxed text-slate-900">{q.question}</p>

      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === correctIdx;
          const isSelected = isCandidate && i === selectedIdx;
          const tone = isSelected
            ? isCorrect
              ? 'border-success bg-success-light text-emerald-900'
              : 'border-danger bg-danger-light text-red-900'
            : isCorrect
              ? isCandidate
                ? 'border-success bg-white text-slate-800'
                : 'border-success bg-success-light text-emerald-900'
              : 'border-slate-200 bg-white text-slate-700';
          const letterTone = isSelected
            ? isCorrect
              ? 'bg-success text-white'
              : 'bg-danger text-white'
            : isCorrect
              ? 'bg-success text-white'
              : 'bg-slate-100 text-slate-500';

          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${tone}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${letterTone}`}
              >
                {LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5">{opt}</span>
              {isSelected && (
                <span
                  className={`shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    isCorrect ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {answerLabel}
                </span>
              )}
              {isCorrect && !isSelected && (
                <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Correct</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        {isCandidate && (
          <p className="text-slate-600">
            {answerLabel}:{' '}
            <span
              className={`font-semibold ${
                status === 'correct' ? 'text-emerald-700' : status === 'wrong' ? 'text-red-700' : 'text-slate-500'
              }`}
            >
              {selectedIdx >= 0 ? `${LETTERS[selectedIdx]}. ${q.options[selectedIdx]}` : 'Not answered'}
            </span>
          </p>
        )}
        <p className="text-slate-600">
          Correct answer:{' '}
          <span className="font-semibold text-emerald-700">
            {correctIdx >= 0 ? `${LETTERS[correctIdx]}. ${q.options[correctIdx]}` : q.correct_option || '—'}
          </span>
        </p>
      </div>

      {isCandidate && q.note && (
        <div className="mt-4 flex gap-2.5 rounded-lg bg-indigo-50 p-3 text-sm leading-relaxed text-slate-700">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 whitespace-pre-wrap break-words">
            <span className="font-semibold text-ink">Explanation: </span>
            {q.note}
          </p>
        </div>
      )}
    </li>
  );
}
