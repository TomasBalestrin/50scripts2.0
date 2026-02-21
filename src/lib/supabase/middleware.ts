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

  // Redirect logged-in users from /login to home
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Only check profile for page routes, not API calls
  const isApiRoute = pathname.startsWith('/api/');
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  if (user && !isApiRoute && pathname !== '/login') {
    const isAdminRoute = pathname.startsWith('/admin');

    // Admin route protection
    if (isAdminRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }

    // Onboarding enforcement: redirect to /onboarding if not completed
    // Skip if already on onboarding route or admin route
    if (!isOnboardingRoute && !isAdminRoute) {
      const onboardingDone = request.cookies.get('_onboarding_done');

      if (!onboardingDone || onboardingDone.value !== user.id) {
        // Check database for onboarding completion
        const { data: onboarding } = await supabase
          .from('user_onboarding')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (onboarding) {
          // Onboarding exists, set cookie to avoid future queries
          supabaseResponse.cookies.set('_onboarding_done', user.id, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            httpOnly: false,
            sameSite: 'lax',
          });
        } else {
          // No onboarding data — redirect to onboarding form
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
