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
  const publicRoutes = ['/login', '/api/webhooks'];
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

  // Check if password changed - redirect to change-password if not
  if (user && pathname !== '/change-password' && pathname !== '/login') {
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
      if (pathname.startsWith('/admin') && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
