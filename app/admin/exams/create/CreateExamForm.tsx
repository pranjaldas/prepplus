'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { BookOpenCheck, CheckCircle2, FileSpreadsheet, Loader2, PartyPopper, Save } from 'lucide-react';
import { checkSheet, createExam } from '@/app/actions/exams';
import { SubmitButton } from '@/components/SubmitButton';
import { CopyButton } from '@/components/CopyButton';

export function CreateExamForm() {
  const [state, formAction] = useFormState(createExam, null);
  const [negative, setNegative] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetCheck, setSheetCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [checking, startCheck] = useTransition();

  function testSheet() {
    if (!sheetUrl.trim()) return;
    setSheetCheck(null);
    startCheck(async () => {
      const res = await checkSheet(sheetUrl.trim());
      setSheetCheck(
        res.ok
          ? { ok: true, message: `Sheet looks good: ${res.data.questionCount} questions found.` }
          : { ok: false, message: res.error },
      );
    });
  }

  if (state?.ok) {
    const { examCode, title, questionCount, id } = state.data;
    return (
      <div className="card p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-success-light p-4 text-success">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-ink">Exam created!</h2>
        <p className="mt-1 text-sm text-slate-500">
          <strong>{title}</strong> · {questionCount} questions
        </p>
        <div className="my-6 rounded-xl border-2 border-dashed border-primary/40 bg-indigo-50 p-6">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Shareable exam code</div>
          <div className="mt-2 font-mono text-4xl font-bold tracking-widest text-ink">{examCode}</div>
          <div className="mt-3">
            <CopyButton value={examCode} label="Copy code" />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/admin/dashboard" className="btn-secondary">
            Back to exams
          </Link>
          <Link href={`/admin/exams/${id}/review`} className="btn-primary">
            <BookOpenCheck className="h-4 w-4" /> Review questions
          </Link>
          <Link href={`/admin/exams/${id}`} className="btn-secondary">
            View exam results page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-5 sm:p-8">
      <div>
        <label htmlFor="title" className="label">
          Exam name
        </label>
        <input id="title" name="title" required minLength={3} className="input" placeholder="NEET Biology Mock #3" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="duration" className="label">
            Duration (minutes)
          </label>
          <input id="duration" name="duration" type="number" min={1} max={600} step={1} required defaultValue={60} className="input" />
        </div>
        <div>
          <label htmlFor="marks" className="label">
            Marks per question
          </label>
          <input id="marks" name="marks" type="number" min={0.25} step={0.25} required defaultValue={4} className="input" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Negative marking</div>
            <div className="text-xs text-slate-500">Deduct marks for wrong answers. Unanswered questions are never penalised.</div>
          </div>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              name="isNegativeMarking"
              className="peer sr-only"
              checked={negative}
              onChange={(e) => setNegative(e.target.checked)}
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-danger peer-focus-visible:ring-2 peer-focus-visible:ring-primary" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
        {negative && (
          <div className="mt-4">
            <label htmlFor="negativeMark" className="label">
              Negative mark per wrong answer
            </label>
            <input id="negativeMark" name="negativeMark" type="number" min={0.25} step={0.25} required defaultValue={1} className="input" />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="sheetUrl" className="label">
          Google Sheet URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="sheetUrl"
            name="sheetUrl"
            type="url"
            required
            value={sheetUrl}
            onChange={(e) => {
              setSheetUrl(e.target.value);
              setSheetCheck(null);
            }}
            className="input"
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          />
          <button type="button" onClick={testSheet} disabled={checking || !sheetUrl.trim()} className="btn-secondary shrink-0">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Test sheet
          </button>
        </div>
        {sheetCheck && (
          <p className={`mt-2 flex items-center gap-1.5 text-sm ${sheetCheck.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {sheetCheck.ok && <CheckCircle2 className="h-4 w-4" />}
            {sheetCheck.message}
          </p>
        )}
      </div>

      {state && !state.ok && <div className="alert-error">{state.error}</div>}

      <SubmitButton pendingText="Validating sheet & saving…">
        <Save className="h-4 w-4" />
        Create exam
      </SubmitButton>
    </form>
  );
}
