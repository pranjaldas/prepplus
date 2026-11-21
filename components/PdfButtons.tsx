'use client';

import { useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

function filenameFrom(res: Response, fallback: string) {
  const match = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

async function fetchPdf(url: string): Promise<Response> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res;
}

/** Generates the scorecard PDF with a visible loading state, then downloads it. */
export function DownloadPdfButton({
  attemptId,
  label = 'Download Preview PDF',
  className = 'btn-primary',
}: {
  attemptId: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function download() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchPdf(`/api/scorecard/${attemptId}?download=1`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFrom(res, 'scorecard.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast({ type: 'success', title: 'PDF downloaded', message: a.download });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Could not generate PDF',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? 'Generating…' : label}
    </button>
  );
}

/** Opens the scorecard PDF in a new tab once it has been generated. */
export function ViewPdfButton({
  attemptId,
  label = 'Preview',
  className = 'btn-secondary',
}: {
  attemptId: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function view() {
    if (loading) return;
    // Open the tab synchronously so popup blockers allow it, then fill it in.
    const tab = window.open('', '_blank');
    if (tab) {
      tab.document.title = 'Generating scorecard…';
      tab.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:2rem;color:#1E1B4B">Generating your scorecard PDF…</p>';
    }
    setLoading(true);
    try {
      const res = await fetchPdf(`/api/scorecard/${attemptId}`);
      const url = URL.createObjectURL(await res.blob());
      if (tab && !tab.closed) tab.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast({
        type: 'error',
        title: 'Could not generate PDF',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={view} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      {loading ? 'Generating…' : label}
    </button>
  );
}
