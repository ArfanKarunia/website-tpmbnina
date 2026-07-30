import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🔥 TAMBAHAN BARU: Menjawab "ketukan pintu" dari Fonnte (GET Method)
export async function GET() {
  console.log("[WA BOT] Fonnte mengecek koneksi Webhook (GET)");
  return NextResponse.json({ message: "Webhook Fonnte Ready" }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("[WA BOT] Menerima Data dari Fonnte:", data); // Biar kamu bisa lihat di log
    
    if (data.status === 'disconnect' || data.status === 'connect') {
      
      const { data: updateData, error } = await supabase
        .from('wa_device_status')
        .update({ status: data.status })
        .eq('id', 1)
        .select(); // Tambahkan select() untuk memastikan data ter-update

      if (error) {
        console.error("[WA BOT] Error Update Supabase:", error.message);
        throw error;
      }
      
      console.log(`[WA BOT] Sukses Update Supabase. Status: ${data.status}`);
    }

    return NextResponse.json({ message: "Status berhasil diupdate" }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal memproses webhook" }, { status: 500 });
  }
}