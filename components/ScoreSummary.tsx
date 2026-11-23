import { CheckCircle2, CircleDashed, Trophy, XCircle } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface ScoreSummaryProps {
  total: number;
  right: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
  /** Whose result this is: the signed-in candidate ("you") or someone an admin is viewing. */
  subject?: 'you' | 'candidate';
}

export function ScoreSummary({
  total,
  right,
  wrong,
  unanswered,
  score,
  maxScore,
  subject = 'you',
}: ScoreSummaryProps) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const scorePct = maxScore > 0 ? Math.max(0, (score / maxScore) * 100) : 0;
  const attempted = right + wrong;
  const accuracy = attempted > 0 ? (right / attempted) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E0E7FF" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke={score < 0 ? '#EF4444' : '#3B82F6'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(scorePct, 100)} 100`}
            />
          </svg>
          <div className="text-center">
            <div className={`text-3xl font-bold ${score < 0 ? 'text-danger' : 'text-ink'}`}>
              {formatNumber(score)}
            </div>
            <div className="text-xs text-slate-500">of {formatNumber(maxScore)}</div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Final Score</span>
          </div>
          <p className="text-sm text-slate-600">
            {subject === 'you' ? 'You' : 'The candidate'} attempted <strong>{attempted}</strong> of <strong>{total}</strong> questions with{' '}
            <strong>{accuracy.toFixed(0)}%</strong> accuracy.
          </p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-success" style={{ width: `${pct(right)}%` }} />
            <div className="bg-danger" style={{ width: `${pct(wrong)}%` }} />
            <div className="bg-slate-300" style={{ width: `${pct(unanswered)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={<CheckCircle2 className="h-5 w-5" />} label="Correct" value={right} tone="success" />
        <StatTile icon={<XCircle className="h-5 w-5" />} label="Wrong" value={wrong} tone="danger" />
        <StatTile icon={<CircleDashed className="h-5 w-5" />} label="Unanswered" value={unanswered} tone="muted" />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'muted';
}) {
  const tones = {
    success: 'bg-success-light text-emerald-700',
    danger: 'bg-danger-light text-red-700',
    muted: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-ink">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}
