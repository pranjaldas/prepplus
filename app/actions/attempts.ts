'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFullSheetData, SheetError } from '@/lib/googleSheets';
import { gradeAttempt, sanitiseAnswers } from '@/lib/grading';
import { normaliseExamCode } from '@/lib/examCode';
import { attemptDeadline } from '@/lib/format';
import type { ActionResult, AnswersMap, Exam, ExamAttempt } from '@/lib/types';

/** Answers that arrive later than this after the deadline are discarded. */
const SUBMIT_GRACE_MS = 90_000;

export async function joinExam(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireProfile();
  const code = normaliseExamCode(String(formData.get('code') ?? ''));
  if (!/^[A-Z0-9-]{6,8}$/.test(code)) {
    return { ok: false, error: 'Exam codes look like PP-4K9Z. Please check and try again.' };
  }

  const admin = createAdminClient();
  const { data } = await admin.from('exams').select('id').eq('exam_code', code).maybeSingle();
  if (!data) return { ok: false, error: 'No exam found with that code.' };

  redirect(`/exam/${encodeURIComponent(code)}/instructions`);
}

export async function startExam(code: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const examCode = normaliseExamCode(code);
  const admin = createAdminClient();

  const { data: exam } = await admin
    .from('exams')
    .select('id, status')
    .eq('exam_code', examCode)
    .maybeSingle();
  if (!exam) return { ok: false, error: 'Exam not found.' };
  if (exam.status !== 'active') return { ok: false, error: 'This exam is no longer active.' };

  const { error } = await admin.from('exam_attempts').insert({
    exam_id: exam.id,
    candidate_id: profile.id,
    status: 'in_progress',
  });

  if (error) {
    if (error.code === '23505') {
      // An attempt already exists. Resume if still in progress, otherwise block.
      const { data: existing } = await admin
        .from('exam_attempts')
        .select('status')
        .eq('exam_id', exam.id)
        .eq('candidate_id', profile.id)
        .single();
      if (existing?.status === 'submitted') {
        return { ok: false, error: 'You have already completed this exam.' };
      }
    } else {
      console.error('Start exam failed', error);
      return { ok: false, error: 'Could not start the exam. Please try again.' };
    }
  }

  redirect(`/exam/${encodeURIComponent(examCode)}/live`);
}

export async function submitExam(
  code: string,
  rawAnswers: AnswersMap,
): Promise<ActionResult> {
  const profile = await requireProfile();
  const examCode = normaliseExamCode(code);
  const admin = createAdminClient();

  const { data: exam } = await admin
    .from('exams')
    .select('*')
    .eq('exam_code', examCode)
    .maybeSingle<Exam>();
  if (!exam) return { ok: false, error: 'Exam not found.' };

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', exam.id)
    .eq('candidate_id', profile.id)
    .maybeSingle<ExamAttempt>();
  if (!attempt) return { ok: false, error: 'You have not started this exam.' };
  if (attempt.status === 'submitted') return { ok: true, data: null };

  let questions;
  try {
    questions = await getFullSheetData(exam.sheet_url);
  } catch (err) {
    console.error('Grading sheet fetch failed', err);
    return {
      ok: false,
      error:
        err instanceof SheetError
          ? `Could not load the answer key: ${err.message}`
          : 'Could not load the answer key. Please retry in a moment.',
    };
  }

  const deadline = attemptDeadline(attempt.started_at, exam.duration_minutes);
  const isLate = Date.now() > deadline + SUBMIT_GRACE_MS;
  // Late submissions (e.g. the tab was closed and reopened after time ran out)
  // can't be trusted, so they are graded as unanswered.
  const answers = isLate ? {} : sanitiseAnswers(rawAnswers, questions.length);

  const result = gradeAttempt(
    questions,
    answers,
    exam.marks_per_question,
    exam.is_negative_marking,
    exam.negative_mark,
  );

  const { error: answersError } = await admin
    .from('candidate_answers')
    .upsert({ attempt_id: attempt.id, answers_json: answers }, { onConflict: 'attempt_id' });
  if (answersError) {
    console.error('Saving answers failed', answersError);
    return { ok: false, error: 'Could not save your answers. Please retry.' };
  }

  const { error: attemptError } = await admin
    .from('exam_attempts')
    .update({
      ...result,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attempt.id)
    .eq('status', 'in_progress');
  if (attemptError) {
    console.error('Updating attempt failed', attemptError);
    return { ok: false, error: 'Could not record your submission. Please retry.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/admin/exams/${exam.id}`);
  return { ok: true, data: null };
}
