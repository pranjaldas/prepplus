export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const value = Number(n);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function markingSummary(exam: {
  marks_per_question: number;
  is_negative_marking: boolean;
  negative_mark: number;
}): string {
  const plus = `+${formatNumber(exam.marks_per_question)} per correct`;
  return exam.is_negative_marking && Number(exam.negative_mark) > 0
    ? `${plus}, -${formatNumber(exam.negative_mark)} per wrong`
    : `${plus}, no negative marking`;
}

/** Attempt deadline in ms since epoch. */
export function attemptDeadline(startedAt: string, durationMinutes: number): number {
  return new Date(startedAt).getTime() + durationMinutes * 60_000;
}
