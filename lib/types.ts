export type Role = 'ADMIN' | 'CANDIDATE';
export type OptionKey = 'option1' | 'option2' | 'option3' | 'option4';
export const OPTION_KEYS: OptionKey[] = ['option1', 'option2', 'option3', 'option4'];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  exam_code: string;
  title: string;
  created_by: string | null;
  sheet_url: string;
  duration_minutes: number;
  marks_per_question: number;
  is_negative_marking: boolean;
  negative_mark: number;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  candidate_id: string;
  status: 'in_progress' | 'submitted';
  started_at: string;
  submitted_at: string | null;
  total_questions: number | null;
  right_count: number | null;
  wrong_count: number | null;
  unanswered_count: number | null;
  final_score: number | null;
}

/** Question index (1-based, as a string) mapped to the selected option key. */
export type AnswersMap = Record<string, OptionKey>;

/** What the candidate's browser is allowed to see during a live exam. */
export interface SanitizedQuestion {
  index: number;
  question: string;
  options: [string, string, string, string];
}

/** Full row, server only (grading and the review PDF). */
export interface FullQuestion extends SanitizedQuestion {
  correct_option: string;
  /** Normalised correct option, or null if the sheet value can't be resolved. */
  correct_key: OptionKey | null;
  note: string;
}

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };
