Build a complete, production-ready online mock examination and performance insights web application named **PrepPulse**.

### 1. Tech Stack & Core Architecture
- **Framework:** Next.js 14+ (App Router, TypeScript, Server Actions, API Routes)
- **Styling & UI:** Tailwind CSS, Lucide React icons
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth via `@supabase/ssr`)
- **Question Data Source:** Google Sheets (questions and answers MUST remain in Google Sheets and NOT be stored in the database; only candidate answer keys and attempt summaries are persisted in Supabase)
- **PDF Generation:** `@react-pdf/renderer` (or `jspdf`) for client/server downloadable review reports

### 2. Brand Identity & Design System
- **Application Name:** PrepPulse
- **Tagline:** *Precision Mock Exams & Instant Insights*
- **Logo:** Create a custom inline SVG logo featuring a minimalist geometric checkmark integrated into a pulse/heartbeat waveform inside a rounded square.
- **Color Palette:** Deep Indigo (`#1E1B4B`) for headers/authority, Electric Blue (`#3B82F6`) for primary CTAs, Emerald Green (`#10B981`) for correct answers/positive metrics, and Rose Red (`#EF4444`) for wrong answers/negative marking.

### 3. Database Schema (Supabase PostgreSQL)
Provide the complete SQL migration script including Row Level Security (RLS) policies and an auth trigger to auto-create profile rows:

1. **`profiles`** (extends `auth.users`)
   - `id` (uuid, PK, references `auth.users(id)`)
   - `email` (text, unique, not null)
   - `full_name` (text, not null)
   - `role` (text, check constraint: `'ADMIN'` or `'CANDIDATE'`, default `'CANDIDATE'`)
   - `phone` (text, nullable)
   - `created_at` (timestamptz, default `now()`)

2. **`exams`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `exam_code` (text, unique, not null — 6-8 char alphanumeric code e.g., `PP-4829`)
   - `title` (text, not null)
   - `created_by` (uuid, references `profiles(id)`)
   - `sheet_url` (text, not null)
   - `duration_minutes` (integer, not null)
   - `marks_per_question` (numeric, not null)
   - `is_negative_marking` (boolean, default `false`)
   - `negative_mark` (numeric, default `0`)
   - `scheduled_at` (timestamptz, default `now()`)
   - `status` (text, default `'active'`)
   - `created_at` (timestamptz, default `now()`)

3. **`exam_attempts`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `exam_id` (uuid, references `exams(id)`)
   - `candidate_id` (uuid, references `profiles(id)`)
   - `status` (text, `'in_progress'` or `'submitted'`)
   - `started_at` (timestamptz, default `now()`)
   - `submitted_at` (timestamptz, nullable)
   - `total_questions` (integer)
   - `right_count` (integer)
   - `wrong_count` (integer)
   - `unanswered_count` (integer)
   - `final_score` (numeric)
   - **CRITICAL CONSTRAINT:** `UNIQUE (exam_id, candidate_id)` so a candidate can NEVER take the same exam twice.

4. **`candidate_answers`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `attempt_id` (uuid, references `exam_attempts(id)` on delete cascade)
   - `answers_json` (jsonb — stores question index to selected option mapping, e.g., `{"1": "option2", "2": "option4"}`)

### 4. Google Sheets Integration Rules
- Google Sheets will be public/viewable via link and have exact columns: `question`, `option1`, `option2`, `option3`, `option4`, `correct_option`, `note`.
- Build a server-side utility (`lib/googleSheets.ts`) that extracts the Sheet ID from any standard Google Sheets URL, fetches the CSV export (`https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv`), and parses it with `papaparse`.
- **Security Requirement:** Create two separate server-side functions:
  1. `getSanitizedQuestions(sheetUrl)`: Strips out `correct_option` and `note` before sending questions to the candidate's browser during a live exam so answers cannot be inspected in network requests.
  2. `getFullSheetData(sheetUrl)`: Returns all columns including `correct_option` and `note`, used strictly on the server during grading and when generating the post-exam review PDF.

### 5. User Roles & Functional Requirements

#### A. Authentication & Middleware (`/login`, `/register`, `middleware.ts`)
- **Candidate Registration (`/register`):** Collects Full Name, Unique Email, and Phone/basic details. Automatically generates the candidate's password using the exact rule: `email.trim().slice(0, 4).toLowerCase() + fullName.trim().replace(/\s+/g, '').slice(0, 4).toLowerCase()` (display the generated password clearly to the user upon registration).
- **Unified Login (`/login`):** Authenticates via Supabase and redirects based on `profiles.role` (`/admin/dashboard` for admins, `/dashboard` for candidates).
- **Route Protection (`middleware.ts`):** Strictly guard `/admin/*` routes for `'admin'` role only, and `/dashboard/*` + `/exam/*` routes for authenticated users.

#### B. Admin Portal (`/admin/*`)
1. **Dashboard (`/admin/dashboard`):**
   - Tabs/Sections separating **Upcoming Exams** and **Past Exams**.
   - Displays exam title, unique `exam_code` (with one-click copy), duration, marking rules, and total candidates appeared.
2. **Create Exam (`/admin/exams/create`):**
   - Form fields: Exam Name, Duration (minutes), Marks per question, `isNegativeMarking` toggle switch, Negative Mark value (shown when toggle is on), Scheduled Date/Time, and Google Sheet URL.
   - Validates that the Google Sheet is accessible and contains all 7 required columns before saving.
   - Generates a unique `exam_code` and displays a success modal/card with the shareable code.
3. **Exam Results & Candidate Scorecards (`/admin/exams/[id]`):**
   - Table of all candidates who appeared for that exam showing Candidate Name, Email, Right, Wrong, Unanswered, Final Score, and a button to view/download their individual scorecard PDF.

#### C. Candidate Portal & Mock Exam Engine (`/dashboard`, `/exam/[code]/*`)
1. **Candidate Dashboard (`/dashboard`):**
   - Prominent **"Join Exam"** card with an input field for `exam_code`.
   - History table/cards of all exams already attempted by the candidate, showing score metrics, a **"View Scorecard"** button, and a **"Download Preview PDF"** button.
2. **Pre-Exam Validation & Instructions (`/exam/[code]/instructions`):**
   - Validates that the `exam_code` exists and checks `exam_attempts` for `(exam_id, candidate_id)`. If an attempt already exists, block entry with a clear message ("You have already completed this exam").
   - Displays exam metadata (total questions, duration, marking scheme, negative marking warning) and clear instructions ("Do not refresh or close the browser window", "Exam auto-submits when the timer ends", "Best of luck!").
   - Clicking **"Start Exam"** creates an `'in_progress'` record in `exam_attempts` with `started_at = now()` and redirects to `/exam/[code]/live`.
3. **Live Mock Exam Interface (`/exam/[code]/live`):**
   - **Sticky Header:** Displays Candidate Name on the left and a live countdown timer (`MM:SS`) on the right calculated against `started_at + duration_minutes`.
   - **Single-Question View:** Renders one question at a time with all 4 options presented as interactive selectable cards with checkboxes (single-select behavior per question).
   - **Navigation & State:** Include `Previous`, `Clear Response`, `Save & Next`, a Question Navigator palette (showing answered vs. unanswered question numbers), and a `Submit Exam` button with confirmation dialog. Persist selections in `localStorage` as a fallback against accidental reloads.
   - **Auto-Submit:** When the timer reaches `00:00`, automatically trigger exam submission without requiring user interaction.
4. **Scorecard & PDF Review (`/exam/[code]/result`):**
   - Server action grades the submitted `answers_json` against the Google Sheet's `correct_option`, computes `right_count`, `wrong_count`, `unanswered_count`, and `final_score` (applying negative marks only to wrong answers, not unanswered ones), and updates `exam_attempts` + `candidate_answers`.
   - Displays a clean visual scorecard summary.
   - **"Download Preview PDF" Button:** Generates a structured PDF containing candidate details, overall scorecard summary, and a question-by-question breakdown showing the Question, all 4 Options, Candidate's Selected Answer (highlighted green if correct, red if wrong), the Correct Answer, and the explanation from the `note` column.

### 6. Deliverable Format
1. Start with the complete **Supabase SQL Schema & RLS Policies**.
2. Provide the exact **folder structure** of the Next.js App Router project.
3. Write clean, complete, copy-pasteable TypeScript/React code for every page, component, server action, utility, and middleware file—avoiding placeholders or truncated `// TODO` comments.