# PrepPulse

*Precision Mock Exams & Instant Insights*

An online mock examination app. Admins create timed exams backed by a Google Sheet, and candidates join with an exam code. Candidates take the exam once, get graded on the server, and can download a question-by-question PDF review.

**Stack:** Next.js 14 (App Router, TypeScript, Server Actions), Tailwind CSS, Lucide icons, Supabase (Postgres + Auth via `@supabase/ssr`), Google Sheets (CSV export + `papaparse`), `@react-pdf/renderer`.

---

## 1. Setup

1. **Create a Supabase project.**
2. **Run the migration.** Paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) into the Supabase SQL editor and run it. It creates the 4 tables, the RLS policies and the trigger that creates profiles.
3. **Configure the environment.** Copy `.env.local.example` to `.env.local` and fill in the values from *Project Settings → API*:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server only, never expose
   ```
4. **Install and run.**
   ```bash
   npm install
   npm run dev        # http://localhost:3000
   ```
5. **Create the first admin.** Register at `/register`, then run this in the SQL editor:
   ```sql
   update public.profiles set role = 'ADMIN' where email = 'you@example.com';
   ```

### Question sheet format

Share the sheet as **"Anyone with the link can view"**. Use exactly these header columns:

| question | option1 | option2 | option3 | option4 | correct_option | note |
|---|---|---|---|---|---|---|

`correct_option` accepts `option1`–`option4`, `1`–`4`, `A`–`D`, or the exact text of the correct option. If you link to a specific tab, its `gid` is respected.

---

## 2. Folder structure

```
.
├── middleware.ts                         # Session refresh + route guards (/admin → ADMIN, /dashboard & /exam → signed in)
├── supabase/migrations/0001_init.sql     # Schema, RLS, auth trigger
├── app/
│   ├── layout.tsx, globals.css, page.tsx, not-found.tsx
│   ├── actions/
│   │   ├── auth.ts                       # registerCandidate, login, logout
│   │   ├── exams.ts                      # createExam, checkSheet (admin)
│   │   └── attempts.ts                   # joinExam, startExam, submitExam (grading)
│   ├── login/        page.tsx, LoginForm.tsx
│   ├── register/     page.tsx, RegisterForm.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── dashboard/  page.tsx                       # Single table of all exams
│   │   └── exams/
│   │       ├── create/ page.tsx, CreateExamForm.tsx   # Sheet validation + exam code modal
│   │       └── [id]/   page.tsx                       # Candidate results table + PDF buttons
│   ├── dashboard/    layout.tsx, page.tsx, JoinExamCard.tsx
│   ├── exam/[code]/
│   │   ├── page.tsx                      # → instructions
│   │   ├── instructions/ page.tsx, StartExamButton.tsx
│   │   ├── live/         page.tsx, LiveExam.tsx      # Timer, navigator, localStorage, auto-submit
│   │   └── result/       page.tsx
│   └── api/scorecard/[attemptId]/route.ts            # PDF (owner or admin only)
├── components/   Logo.tsx, AppHeader.tsx, AuthShell.tsx, CopyButton.tsx, SubmitButton.tsx, ScoreSummary.tsx
├── lib/
│   ├── googleSheets.ts                   # getSanitizedQuestions / getFullSheetData / validateSheet
│   ├── grading.ts                        # sanitiseAnswers, gradeAttempt
│   ├── pdf/ScorecardDocument.tsx         # React-PDF review report
│   ├── supabase/ client.ts, server.ts, admin.ts, middleware.ts
│   ├── auth.ts, examContext.ts, examCode.ts, password.ts, format.ts, types.ts
└── public/icon.svg
```

---

## 3. Security model

- **Answer keys never reach the browser during an exam.** The live page only receives `getSanitizedQuestions()` output. `getFullSheetData()` is used only in `submitExam` and the PDF route. Both live in `server-only` modules.
- **`sheet_url` is never exposed to candidates.** RLS lets only admins read `exams`. Candidate pages resolve exam codes on the server with the service-role key and always filter by the signed-in user's id.
- **Candidates can't write their own scores.** There are no client insert/update policies on `exam_attempts` or `candidate_answers`. All writes go through server actions.
- **One attempt per exam** is enforced by `UNIQUE (exam_id, candidate_id)`. A candidate whose attempt is in progress can *resume* (the timer keeps running); a submitted attempt is blocked.
- **The server enforces the timer.** A submission that arrives more than 90 s after `started_at + duration` is graded with no answers. This stops candidates from extending their time by disabling JavaScript.
- **Profile roles can't be self-assigned.** The signup trigger ignores any role in user metadata, and only admins can update profiles.

## 4. Known trade-offs

- **The generated password is guessable.** The spec's rule (first 4 characters of the email + first 4 letters of the name) means anyone who knows both can log in. Consider forcing a password change on first login.
- **Public sheets.** Anyone who obtains the sheet URL can read the answers. The app never reveals it, but admins should not share it.
- **Sheet edits after an exam** change the PDF review, which is re-read from the sheet at download time. Stored scores do not change.
- **PDF fonts.** The PDF uses the built-in Helvetica font. Text in non-Latin scripts (e.g. Devanagari) needs a custom font registered with `Font.register`.
