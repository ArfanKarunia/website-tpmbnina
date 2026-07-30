import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  console.log("[WA BOT] Fonnte mengecek koneksi Webhook (GET)");
  return NextResponse.json({ message: "Webhook Fonnte Ready" }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    let data: any = {};
    const contentType = request.headers.get("content-type") || "";

    // 1. Cek Fonnte ngirim pakai format apa? (JSON atau Form Data)
    if (contentType.includes("application/json")) {
      data = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      // Kalau formatnya aneh, paksa baca teksnya
      const text = await request.text();
      try { data = JSON.parse(text); } catch (e) {}
    }

    console.log("[WA BOT] Menerima Laporan Fonnte:", data);
    
    // 2. Update Supabase
    if (data.status === 'disconnect' || data.status === 'connect') {
      const { error } = await supabase
        .from('wa_device_status')
        .update({ status: data.status })
        .eq('id', 1);

      if (error) {
        console.error("[WA BOT] Gagal Update Supabase:", error.message);
        throw error;
      }
      
      console.log(`[WA BOT] Sukses! Status diubah menjadi: ${data.status}`);
    }

    return NextResponse.json({ message: "Status berhasil diupdate" }, { status: 200 });

  } catch (error) {
    console.error("[WA BOT] Error Catch:", error);
    return NextResponse.json({ message: "Gagal memproses webhook" }, { status: 500 });
  }
}