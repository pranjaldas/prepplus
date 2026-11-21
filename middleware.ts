import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_PAGES = ['/login', '/register'];

function isUnder(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Redirect while keeping any refreshed auth cookies. */
function redirectWithCookies(request: NextRequest, base: NextResponse, to: string) {
  const url = request.nextUrl.clone();
  const [pathname, search] = to.split('?');
  url.pathname = pathname;
  url.search = search ? `?${search}` : '';
  const res = NextResponse.redirect(url);
  base.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export async function middleware(request: NextRequest) {
  const { supabase, user, getResponse } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isAdminRoute = isUnder(path, '/admin');
  const isUserRoute = isUnder(path, '/dashboard') || isUnder(path, '/exam');
  const isAuthPage = AUTH_PAGES.includes(path);

  if (!isAdminRoute && !isUserRoute && !isAuthPage) return getResponse();

  if (!user) {
    if (isAuthPage) return getResponse();
    const next = encodeURIComponent(path + request.nextUrl.search);
    return redirectWithCookies(request, getResponse(), `/login?next=${next}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role ?? 'CANDIDATE';

  if (isAuthPage) {
    return redirectWithCookies(
      request,
      getResponse(),
      role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
    );
  }

  if (isAdminRoute && role !== 'ADMIN') {
    return redirectWithCookies(request, getResponse(), '/dashboard');
  }

  return getResponse();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
