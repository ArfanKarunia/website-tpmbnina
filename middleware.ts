import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 1. Siapkan Response awal
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Buat Supabase Client khusus Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Cek User yang sedang login
  // (Penting: pakai getUser, bukan getSession karena lebih aman)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. ATURAN KEAMANAN (THE LOGIC)
  const url = request.nextUrl.clone();

  // A. PROTEKSI DASHBOARD
  // Jika user mau masuk ke "/dashboard" TAPI belum login (!user)
  // Maka tendang ke "/login"
  if (url.pathname.startsWith("/dashboard") && !user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // B. REDIRECT JIKA SUDAH LOGIN
  // Jika user SUDAH login TAPI mau masuk ke "/login" (ngapain login lagi?)
  // Maka lempar langsung ke "/dashboard"
  if (url.pathname === "/login" && user) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 5. Kembalikan response (Lanjut)
  return response;
}

// 6. KONFIGURASI MATCHER
// Tentukan halaman mana saja yang harus dicek oleh Middleware ini.
// Kita kecualikan file statis (gambar, icon, dll) biar website gak lemot.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};