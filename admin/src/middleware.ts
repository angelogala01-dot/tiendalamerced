import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { STAFF_ROLES } from '@/constants/routes';
import { canAccessPath, homeForRole, isStaffRole } from '@/lib/rbac';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/login') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  const metaRole = user.app_metadata?.role as string | undefined;
  let role = metaRole;
  let isActive = user.user_metadata?.is_active !== false;

  if (!isStaffRole(role) || user.user_metadata?.is_active === false) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role ?? metaRole;
    isActive = profile?.is_active ?? true;
  }

  if (!isActive || !isStaffRole(role) || !STAFF_ROLES.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(role, path)) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
