import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/termos', '/privacidade', '/api/webhooks', '/api/setup', '/api/cron', '/api/health'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Only check profile for page routes, not API calls
  const isApiRoute = pathname.startsWith('/api/');

  if (user && !isApiRoute && pathname !== '/change-password' && pathname !== '/login') {
    const isAdminRoute = pathname.startsWith('/admin');

    // OPTIMIZATION: Once password_changed + onboarding_completed are both true,
    // we store user.id in a cookie to skip the profiles query on future navigations.
    // This saves ~50-100ms per page load for the common case.
    const setupCookie = request.cookies.get('_setup_done')?.value;
    const setupDone = setupCookie === user.id;

    // Skip profile query when setup is done AND not an admin route
    if (!setupDone || isAdminRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_changed, onboarding_completed, role, plan')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (!profile.password_changed && pathname !== '/change-password') {
          const url = request.nextUrl.clone();
          url.pathname = '/change-password';
          return NextResponse.redirect(url);
        }

        if (
          profile.password_changed &&
          !profile.onboarding_completed &&
          pathname !== '/onboarding' &&
          pathname !== '/change-password'
        ) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }

        // Admin route protection
        if (isAdminRoute && profile.role !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }

        // Cache setup completion to skip future profile queries
        if (profile.password_changed && profile.onboarding_completed && !setupDone) {
          supabaseResponse.cookies.set('_setup_done', user.id, {
            maxAge: 86400 * 7, // 7 days
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
          });
        }
      }
    }
  }

  return supabaseResponse;
}
