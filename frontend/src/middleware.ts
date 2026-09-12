import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  const code = 'code' in error ? String((error as { code?: string }).code ?? '') : '';
  return (
    /refresh token/i.test(message) ||
    /invalid.?refresh/i.test(message) ||
    code === 'refresh_token_not_found'
  );
}

export async function middleware(request: NextRequest) {
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

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: 'local' });
      user = null;
    } else {
      user = data.user;
    }
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
    }
    user = null;
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith('/pedidos/confirmacion')) {
    return supabaseResponse;
  }

  const protectedCustomerRoutes = ['/perfil', '/pedidos', '/checkout'];
  if (protectedCustomerRoutes.some((r) => path.startsWith(r)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/perfil/:path*', '/pedidos/:path*', '/checkout'],
};
