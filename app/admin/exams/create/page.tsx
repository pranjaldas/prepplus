import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { REQUIRED_COLUMNS } from '@/lib/googleSheets';
import { CreateExamForm } from './CreateExamForm';

export const metadata: Metadata = { title: 'Create Exam' };

export default async function CreateExamPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-ink">Create Exam</h1>
        <p className="mt-1 text-sm text-slate-500">
          Questions stay in your Google Sheet. It must be shared as &quot;Anyone with the link can view&quot; and
          have these columns:{' '}
          {REQUIRED_COLUMNS.map((c, i) => (
            <span key={c}>
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{c}</code>
              {i < REQUIRED_COLUMNS.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
      <CreateExamForm />
    </div>
  );
}
