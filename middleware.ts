import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Tambahkan daftar bahasa yang didukung
const locales = ['id', 'en'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Cek apakah URL sudah punya prefix bahasa (/id atau /en)
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // 2. Kalau URL-nya masih polos (misal /dashboard atau /), kita harus cek dulu
  // Apakah ini file sistem (gambar, api, favicon)? Kalau iya, biarkan lewat.
  if (
    !pathnameHasLocale &&
    !pathname.startsWith('/_next') &&
    !pathname.includes('.') // Cek ekstensi file (.jpg, .svg, dll)
  ) {
    // Redirect default ke bahasa Indonesia (/id)
    // Contoh: Buka '/' -> Redirect ke '/id'
    const locale = 'id';
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // --- LOGIKA SUPABASE AUTH (TETAP DIPERTAHANKAN) ---
  // Kita sesuaikan path dashboard agar support bahasa
  // Misal: /id/dashboard atau /en/dashboard
  
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Cek Dashboard dengan dukungan locale
  // Regex: mendeteksi /id/dashboard atau /en/dashboard
  const isDashboard = /^\/(id|en)\/dashboard/.test(pathname);
  const isLogin = /^\/(id|en)\/login/.test(pathname);

  if (isDashboard && !user) {
    // Redirect ke login dengan bahasa yang sama
    const locale = pathname.split('/')[1]; // ambil 'id' atau 'en'
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const locale = pathname.split('/')[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Matcher dimodifikasi agar menangkap semua path kecuali file statis
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};