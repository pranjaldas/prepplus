'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SheetError, validateSheet } from '@/lib/googleSheets';
import { generateExamCode } from '@/lib/examCode';
import type { ActionResult } from '@/lib/types';

export interface CreatedExam {
  id: string;
  examCode: string;
  title: string;
  questionCount: number;
}

function sheetErrorMessage(err: unknown): string {
  if (err instanceof SheetError) return err.message;
  console.error('Sheet validation failed', err);
  return 'Could not read the Google Sheet. Please check the URL and sharing settings.';
}

/** "Test sheet" button on the create form. */
export async function checkSheet(sheetUrl: string): Promise<ActionResult<{ questionCount: number }>> {
  await requireAdmin();
  try {
    const result = await validateSheet(sheetUrl);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: sheetErrorMessage(err) };
  }
}

export async function createExam(
  _prev: ActionResult<CreatedExam> | null,
  formData: FormData,
): Promise<ActionResult<CreatedExam>> {
  const admin = await requireAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const duration = Number(formData.get('duration'));
  const marks = Number(formData.get('marks'));
  const isNegative = formData.get('isNegativeMarking') === 'on';
  const negativeMark = isNegative ? Number(formData.get('negativeMark')) : 0;
  const sheetUrl = String(formData.get('sheetUrl') ?? '').trim();

  if (title.length < 3) return { ok: false, error: 'Exam name must be at least 3 characters.' };
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
    return { ok: false, error: 'Duration must be a whole number between 1 and 600 minutes.' };
  }
  if (!Number.isFinite(marks) || marks <= 0) {
    return { ok: false, error: 'Marks per question must be greater than 0.' };
  }
  if (isNegative && (!Number.isFinite(negativeMark) || negativeMark <= 0)) {
    return { ok: false, error: 'Negative mark must be greater than 0 when negative marking is on.' };
  }
  if (!sheetUrl) return { ok: false, error: 'Google Sheet URL is required.' };

  let questionCount: number;
  try {
    ({ questionCount } = await validateSheet(sheetUrl));
  } catch (err) {
    return { ok: false, error: sheetErrorMessage(err) };
  }

  const supabase = createClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const examCode = generateExamCode();
    const { data, error } = await supabase
      .from('exams')
      .insert({
        exam_code: examCode,
        title,
        created_by: admin.id,
        sheet_url: sheetUrl,
        duration_minutes: duration,
        marks_per_question: marks,
        is_negative_marking: isNegative,
        negative_mark: isNegative ? negativeMark : 0,
        status: 'active',
      })
      .select('id, exam_code, title')
      .single();

    if (!error && data) {
      revalidatePath('/admin/dashboard');
      return {
        ok: true,
        data: { id: data.id, examCode: data.exam_code, title: data.title, questionCount },
      };
    }
    // 23505 = unique violation on exam_code: try a new code.
    if (error?.code !== '23505') {
      console.error('Create exam failed', error);
      return { ok: false, error: 'Could not save the exam. Please try again.' };
    }
  }

  return { ok: false, error: 'Could not generate a unique exam code. Please try again.' };
}
