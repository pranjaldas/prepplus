import { OPTION_KEYS, type AnswersMap, type FullQuestion, type OptionKey } from './types';

export interface GradeResult {
  total_questions: number;
  right_count: number;
  wrong_count: number;
  unanswered_count: number;
  final_score: number;
}

/** Drops anything that isn't a valid (question index -> option key) pair. */
export function sanitiseAnswers(raw: unknown, totalQuestions: number): AnswersMap {
  const out: AnswersMap = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 1 || index > totalQuestions) continue;
    if (typeof value !== 'string' || !OPTION_KEYS.includes(value as OptionKey)) continue;
    out[String(index)] = value as OptionKey;
  }
  return out;
}

/** Negative marks apply only to wrong answers, never to unanswered questions. */
export function gradeAttempt(
  questions: FullQuestion[],
  answers: AnswersMap,
  marksPerQuestion: number,
  isNegativeMarking: boolean,
  negativeMark: number,
): GradeResult {
  let right = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const q of questions) {
    const selected = answers[String(q.index)];
    if (!selected) unanswered += 1;
    else if (q.correct_key && selected === q.correct_key) right += 1;
    else wrong += 1;
  }

  const penalty = isNegativeMarking ? wrong * Number(negativeMark) : 0;
  const score = right * Number(marksPerQuestion) - penalty;

  return {
    total_questions: questions.length,
    right_count: right,
    wrong_count: wrong,
    unanswered_count: unanswered,
    final_score: Math.round(score * 100) / 100,
  };
}
