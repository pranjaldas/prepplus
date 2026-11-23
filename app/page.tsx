import Link from 'next/link';
import { BarChart3, FileText, Instagram, Linkedin, Phone, ShieldCheck, Timer } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { getCurrentProfile, homeFor } from '@/lib/auth';

const CREATOR = {
  name: 'Pranjal Das',
  linkedin: 'https://www.linkedin.com/in/pranjal-das-03bba217b/',
  instagram: 'https://www.instagram.com/pranjaldas525/',
  phone: '9678186292',
};

const FEATURES = [
  {
    icon: Timer,
    title: 'Real exam conditions',
    text: 'Timed, single-question view with a navigator palette and auto-submit at 00:00.',
  },
  {
    icon: ShieldCheck,
    title: 'Answer-safe by design',
    text: 'Answer keys never reach the browser during a live exam. Grading happens on the server.',
  },
  {
    icon: BarChart3,
    title: 'Instant insights',
    text: 'Right, wrong and unanswered counts with negative marking applied the moment you submit.',
  },
  {
    icon: FileText,
    title: 'Detailed answer review',
    text: 'Question-by-question breakdown with correct answers and explanations to learn from.',
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-ink">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Logo light />
        <div className="flex items-center gap-2">
          {profile ? (
            <Link href={homeFor(profile.role)} className="btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:pt-24">
          <span className="badge mb-6 bg-white/10 text-indigo-100">Mock exams · Live scoring · Answer review</span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Precision Mock Exams &amp;{' '}
            <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              Instant Insights
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-200">
            Join an exam with a code, take it under real exam conditions, and get a detailed scorecard
            the moment you submit.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Create candidate account
            </Link>
            <Link href="/login" className="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6">
                <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>
            © {new Date().getFullYear()} PrepPulse · Built by{' '}
            <span className="font-semibold text-ink">{CREATOR.name}</span>
          </span>
          <span className="flex items-center gap-3">
            <a
              href={CREATOR.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
              className="text-slate-400 transition hover:text-[#0A66C2]"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={CREATOR.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
              className="text-slate-400 transition hover:text-pink-600"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={`tel:${CREATOR.phone}`}
              className="inline-flex items-center gap-1 text-slate-400 transition hover:text-success"
            >
              <Phone className="h-4 w-4" />
              {CREATOR.phone}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
