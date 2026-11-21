import 'server-only';
import { createAdminClient } from './supabase/admin';
import { normaliseExamCode } from './examCode';
import type { Exam, ExamAttempt } from './types';

/** Looks up an exam by code and the given candidate's attempt at it (if any). */
export async function loadExamForCandidate(rawCode: string, candidateId: string) {
  const code = normaliseExamCode(rawCode);
  const admin = createAdminClient();

  const { data: exam } = await admin.from('exams').select('*').eq('exam_code', code).maybeSingle<Exam>();
  if (!exam) return { code, exam: null, attempt: null };

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', exam.id)
    .eq('candidate_id', candidateId)
    .maybeSingle<ExamAttempt>();

  return { code, exam, attempt: attempt ?? null };
}
