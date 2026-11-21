'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { FLASH_COOKIE, encodeFlash } from '@/lib/flash';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePassword } from '@/lib/password';
import { homeFor } from '@/lib/auth';
import type { ActionResult } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

export async function registerCandidate(
  _prev: ActionResult<RegisterData> | null,
  formData: FormData,
): Promise<ActionResult<RegisterData>> {
  const fullName = String(formData.get('fullName') ?? '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();

  if (fullName.replace(/\s+/g, '').length < 2) {
    return { ok: false, error: 'Please enter your full name (at least 2 letters).' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!PHONE_RE.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number (7–15 digits).' };
  }

  const password = generatePassword(email, fullName);
  if (password.length < 6) {
    return { ok: false, error: 'Your name is too short to generate a valid password.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('exists') || error.status === 422) {
      return { ok: false, error: 'An account with this email already exists. Please log in.' };
    }
    return { ok: false, error: `Registration failed: ${error.message}` };
  }

  return { ok: true, data: { email, password, fullName } };
}

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) return { ok: false, error: 'Email and password are required.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role;
  const firstName = profile?.full_name?.split(' ')[0];
  cookies().set(
    FLASH_COOKIE,
    encodeFlash({
      type: 'success',
      title: firstName ? `Welcome back, ${firstName}!` : 'Welcome back!',
      message: role === 'ADMIN' ? 'Signed in to the admin portal.' : 'You are signed in. Good luck with your exams.',
    }),
    { path: '/', maxAge: 30, sameSite: 'lax' },
  );
  // Only follow `next` for same-site paths the user is allowed to visit.
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') && (role === 'ADMIN' || !next.startsWith('/admin'))
      ? next
      : null;

  redirect(safeNext ?? homeFor(role));
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
