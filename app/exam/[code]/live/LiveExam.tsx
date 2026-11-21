'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Loader2,
  Send,
  Timer,
  User,
} from 'lucide-react';
import { submitExam } from '@/app/actions/attempts';
import { LogoMark } from '@/components/Logo';
import { OPTION_KEYS, type AnswersMap, type OptionKey, type SanitizedQuestion } from '@/lib/types';

interface LiveExamProps {
  code: string;
  attemptId: string;
  examTitle: string;
  candidateName: string;
  questions: SanitizedQuestion[];
  /** Deadline in ms since epoch (server clock). */
  deadline: number;
  /** Server time when the page was rendered, to correct client clock skew. */
  serverNow: number;
}

interface StoredState {
  answers: AnswersMap;
  current: number;
  visited: number[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LiveExam({
  code,
  attemptId,
  examTitle,
  candidateName,
  questions,
  deadline,
  serverNow,
}: LiveExamProps) {
  const router = useRouter();
  const storageKey = `preppulse:attempt:${attemptId}`;
  const total = questions.length;

  const [answers, setAnswers] = useState<AnswersMap>({});
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<AnswersMap>({});
  const skewRef = useRef(0);
  answersRef.current = answers;

  // Restore saved progress (fallback against accidental reloads).
  useEffect(() => {
    skewRef.current = serverNow - Date.now();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as StoredState;
        const clean: AnswersMap = {};
        for (const [k, v] of Object.entries(saved.answers ?? {})) {
          const idx = Number(k);
          if (idx >= 1 && idx <= total && OPTION_KEYS.includes(v)) clean[k] = v;
        }
        setAnswers(clean);
        if (Number.isInteger(saved.current) && saved.current >= 0 && saved.current < total) {
          setCurrent(saved.current);
        }
        if (Array.isArray(saved.visited)) {
          setVisited(new Set(saved.visited.filter((n) => n >= 0 && n < total)));
        }
      }
    } catch {
      // Corrupt or unavailable storage: start fresh.
    }
    setHydrated(true);
  }, [storageKey, serverNow, total]);

  // Persist progress on every change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const state: StoredState = { answers, current, visited: Array.from(visited) };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the exam still works, just without reload recovery.
    }
  }, [answers, current, visited, hydrated, storageKey]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setConfirmOpen(false);

      const maxTries = auto ? 4 : 1;
      for (let tryNo = 1; tryNo <= maxTries; tryNo++) {
        try {
          const res = await submitExam(code, answersRef.current);
          if (res.ok) {
            try {
              localStorage.removeItem(storageKey);
            } catch {
              /* ignore */
            }
            router.replace(`/exam/${encodeURIComponent(code)}/result`);
            return;
          }
          setSubmitError(res.error);
        } catch {
          setSubmitError('Network error while submitting. Check your connection.');
        }
        if (tryNo < maxTries) await new Promise((r) => setTimeout(r, 2000 * tryNo));
      }

      submittingRef.current = false;
      setSubmitting(false);
    },
    [code, router, storageKey],
  );

  // Countdown and auto-submit at 00:00.
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const left = deadline - (Date.now() + skewRef.current);
      setRemaining(left);
      if (left <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void doSubmit(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, doSubmit, hydrated]);

  // Warn before leaving the page mid-exam.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submittingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= total) return;
      setCurrent(idx);
      setVisited((prev) => new Set(prev).add(idx));
    },
    [total],
  );

  // Keep the current question's number in view in both navigators.
  useEffect(() => {
    const strip = stripRef.current;
    const stripBtn = strip?.querySelector<HTMLElement>(`[data-q="${current}"]`);
    if (strip && stripBtn && strip.offsetParent !== null) {
      strip.scrollTo({
        left: stripBtn.offsetLeft - strip.clientWidth / 2 + stripBtn.offsetWidth / 2,
        behavior: 'smooth',
      });
    }
    const grid = gridRef.current;
    const gridBtn = grid?.querySelector<HTMLElement>(`[data-q="${current}"]`);
    if (grid && gridBtn && grid.offsetParent !== null) {
      const top = gridBtn.offsetTop;
      const bottom = top + gridBtn.offsetHeight;
      if (top < grid.scrollTop + 8 || bottom > grid.scrollTop + grid.clientHeight - 8) {
        grid.scrollTo({ top: top - grid.clientHeight / 2 + gridBtn.offsetHeight / 2, behavior: 'smooth' });
      }
    }
  }, [current, hydrated]);

  const q = questions[current];
  const qKey = String(q?.index ?? current + 1);
  const selected = answers[qKey];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const timeUp = remaining !== null && remaining <= 0;
  const locked = submitting || timeUp;

  function select(option: OptionKey) {
    if (locked) return;
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[qKey] === option) delete next[qKey];
      else next[qKey] = option;
      return next;
    });
  }

  function clearResponse() {
    if (locked) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qKey];
      return next;
    });
  }

  const timerTone =
    remaining === null
      ? 'bg-white/10'
      : remaining <= 60_000
        ? 'bg-danger animate-pulse'
        : remaining <= 5 * 60_000
          ? 'bg-amber-500'
          : 'bg-white/10';

  if (total === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card p-8 text-center text-slate-600">This exam has no questions.</div>
      </div>
    );
  }

  function paletteButton(item: SanitizedQuestion, i: number, sizeClass: string) {
    const isAnswered = !!answers[String(item.index)];
    const isCurrent = i === current;
    const isVisited = visited.has(i);
    const tone = isAnswered
      ? 'bg-success text-white border-success'
      : isVisited
        ? 'bg-danger-light text-red-700 border-red-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';
    return (
      <button
        key={item.index}
        type="button"
        data-q={i}
        onClick={() => goTo(i)}
        aria-label={`Question ${item.index}${isAnswered ? ', answered' : ''}`}
        aria-current={isCurrent ? 'step' : undefined}
        className={`rounded-lg border text-sm font-semibold transition hover:brightness-95 ${sizeClass} ${tone} ${
          isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
      >
        {item.index}
      </button>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky header: candidate on the left, timer on the right */}
      <header className="sticky top-0 z-30 bg-ink text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark size={32} className="hidden shrink-0 sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                <User className="h-4 w-4 shrink-0 text-indigo-300" />
                <span className="truncate">{candidateName}</span>
              </div>
              <div className="truncate text-xs text-indigo-200">{examTitle}</div>
            </div>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-lg font-bold tabular-nums sm:gap-2 sm:px-3 sm:text-xl ${timerTone}`}
            role="timer"
            aria-live="off"
          >
            <Timer className="h-5 w-5" />
            {remaining === null ? '--:--' : formatClock(remaining)}
          </div>
        </div>
      </header>

      {submitError && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4">
          <div className="alert-error flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {submitError}
            </span>
            {!submitting && (
              <button type="button" onClick={() => void doSubmit(timeUp)} className="btn-danger px-3 py-1.5 text-xs">
                Retry submit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phones & tablets: horizontal question strip pinned under the header */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white shadow-sm lg:hidden">
        <div className="mx-auto max-w-6xl px-3 pt-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ink">
              Q {current + 1}/{total}
              <span className="ml-2 font-normal text-slate-500">{answeredCount} answered</span>
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={locked}
              className="btn-danger px-3 py-1 text-xs"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </button>
          </div>
          <div
            ref={stripRef}
            className="relative -mx-3 flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:thin] sm:-mx-4 sm:px-4"
            aria-label="Question navigator"
          >
            {questions.map((item, i) => paletteButton(item, i, 'h-9 min-w-[2.25rem] shrink-0 px-1.5'))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-3 pb-24 pt-4 sm:px-4 sm:py-6 lg:grid-cols-[1fr_300px]">
        {/* Question panel */}
        <section className="card flex flex-col p-4 sm:p-8">
          <div className="mb-4 hidden items-center justify-between gap-2 lg:flex">
            <span className="badge bg-indigo-50 text-ink">
              Question {current + 1} of {total}
            </span>
          </div>

          <h2 className="whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-slate-900 sm:text-lg">
            {q.question}
          </h2>

          <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3" role="radiogroup" aria-label={`Options for question ${current + 1}`}>
            {q.options.map((text, i) => {
              const key = OPTION_KEYS[i];
              const isSel = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={() => select(key)}
                  disabled={locked}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition sm:gap-4 sm:p-4 ${
                    isSel
                      ? 'border-primary bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50'
                  } disabled:cursor-not-allowed`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      isSel ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSel && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="w-5 shrink-0 font-semibold text-slate-500">{LETTERS[i]}.</span>
                  <span className="min-w-0 whitespace-pre-wrap break-words text-slate-800">{text}</span>
                </button>
              );
            })}
          </div>

          {/* Actions: fixed bottom bar on phones, inline on tablet/desktop */}
          <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] sm:static sm:z-auto sm:mt-6 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:border-slate-100 sm:bg-transparent sm:p-0 sm:pt-6 sm:shadow-none">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="btn-secondary px-2 sm:px-4"
            >
              <ChevronLeft className="h-4 w-4" /> <span>Prev<span className="hidden sm:inline">ious</span></span>
            </button>
            <div className="contents sm:flex sm:gap-3">
              <button
                type="button"
                onClick={clearResponse}
                disabled={!selected || locked}
                className="btn-secondary px-2 sm:px-4"
              >
                <Eraser className="h-4 w-4" /> <span>Clear<span className="hidden sm:inline"> Response</span></span>
              </button>
              {current < total - 1 ? (
                <button type="button" onClick={() => goTo(current + 1)} disabled={locked} className="btn-primary px-2 sm:px-4">
                  <span><span className="hidden sm:inline">Save &amp; </span>Next</span> <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmOpen(true)} disabled={locked} className="btn-success px-2 sm:px-4">
                  <Send className="h-4 w-4" /> <span><span className="hidden sm:inline">Save &amp; </span>Submit</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Desktop palette: fits the viewport, the number grid scrolls, Submit stays visible */}
        <aside className="card sticky top-[5.5rem] hidden max-h-[calc(100dvh-7rem)] flex-col p-5 lg:flex">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Question Navigator</h3>
            <span className="text-xs text-slate-500">
              {answeredCount}/{total} answered
            </span>
          </div>
          <div
            ref={gridRef}
            className="relative -mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]"
          >
            <div className="grid grid-cols-5 gap-2">
              {questions.map((item, i) => paletteButton(item, i, 'h-10'))}
            </div>
          </div>
          <div className="mt-3 shrink-0 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <Legend className="bg-success" label="Answered" />
            <Legend className="border border-red-200 bg-danger-light" label="Visited, not answered" />
            <Legend className="border border-slate-200 bg-slate-50" label="Not visited" />
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={locked}
            className="btn-danger mt-4 w-full shrink-0"
          >
            <Send className="h-4 w-4" /> Submit Exam
          </button>
        </aside>
      </div>

      {/* Submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-ink">Submit your exam?</h3>
            <p className="mt-1 text-sm text-slate-600">You won&apos;t be able to change your answers after submitting.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-success-light p-4">
                <div className="text-2xl font-bold text-emerald-700">{answeredCount}</div>
                <div className="text-xs text-emerald-700">Answered</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-4">
                <div className="text-2xl font-bold text-slate-700">{total - answeredCount}</div>
                <div className="text-xs text-slate-600">Unanswered</div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="btn-secondary flex-1">
                Keep working
              </button>
              <button type="button" onClick={() => void doSubmit(false)} className="btn-danger flex-1">
                Yes, submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4 text-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin" />
            <p className="mt-4 text-lg font-semibold">
              {timeUp ? "Time's up! Submitting your answers…" : 'Submitting your answers…'}
            </p>
            <p className="mt-1 text-sm text-indigo-200">Please don&apos;t close this window.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded ${className}`} />
      {label}
    </div>
  );
}
