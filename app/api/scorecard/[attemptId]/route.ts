import { createElement, type ReactElement } from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFullSheetData, SheetError } from '@/lib/googleSheets';
import { sanitiseAnswers } from '@/lib/grading';
import { ScorecardDocument } from '@/lib/pdf/ScorecardDocument';
import type { Exam, ExamAttempt, Profile } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'scorecard';
}

export async function GET(request: Request, { params }: { params: { attemptId: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.attemptId)) {
    return new Response('Not found', { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();

  const { data: viewer } = await admin.from('profiles').select('role').eq('id', user.id).single();

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('*')
    .eq('id', params.attemptId)
    .maybeSingle<ExamAttempt>();
  if (!attempt) return new Response('Not found', { status: 404 });

  // Only the candidate themselves or an admin may see a scorecard.
  if (attempt.candidate_id !== user.id && viewer?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }
  if (attempt.status !== 'submitted') {
    return new Response('This exam has not been submitted yet.', { status: 409 });
  }

  const [{ data: exam }, { data: candidate }, { data: answerRow }] = await Promise.all([
    admin.from('exams').select('*').eq('id', attempt.exam_id).single<Exam>(),
    admin.from('profiles').select('*').eq('id', attempt.candidate_id).single<Profile>(),
    admin.from('candidate_answers').select('answers_json').eq('attempt_id', attempt.id).maybeSingle(),
  ]);
  if (!exam || !candidate) return new Response('Not found', { status: 404 });

  let questions;
  try {
    questions = await getFullSheetData(exam.sheet_url);
  } catch (err) {
    const msg = err instanceof SheetError ? err.message : 'Could not load the question sheet.';
    return new Response(msg, { status: 502 });
  }

  const answers = sanitiseAnswers(answerRow?.answers_json ?? {}, questions.length);

  const doc = createElement(ScorecardDocument, {
    candidate: { name: candidate.full_name, email: candidate.email, phone: candidate.phone },
    exam: {
      title: exam.title,
      code: exam.exam_code,
      durationMinutes: exam.duration_minutes,
      marksPerQuestion: Number(exam.marks_per_question),
      isNegativeMarking: exam.is_negative_marking,
      negativeMark: Number(exam.negative_mark),
    },
    attempt: {
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      total: attempt.total_questions ?? questions.length,
      right: attempt.right_count ?? 0,
      wrong: attempt.wrong_count ?? 0,
      unanswered: attempt.unanswered_count ?? 0,
      score: Number(attempt.final_score ?? 0),
    },
    questions,
    answers,
  }) as unknown as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(doc);

  const download = new URL(request.url).searchParams.get('download') === '1';
  const filename = `${slug(exam.exam_code)}-${slug(candidate.full_name)}-scorecard.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
