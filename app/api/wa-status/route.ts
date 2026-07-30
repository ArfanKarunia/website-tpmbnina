import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Buat client Supabase server-side
// Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY ada di file .env.local kamu
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Pastikan data yang masuk benar-benar dari Fonnte (ada atribut status)
    if (data.status === 'disconnect' || data.status === 'connect') {
      
      // Update status ke tabel wa_device_status di Supabase (Baris dengan ID 1)
      const { error } = await supabase
        .from('wa_device_status')
        .update({ status: data.status })
        .eq('id', 1);

      if (error) throw error;
      
      console.log(`[WA BOT] Status diubah menjadi: ${data.status}`);
    }

    return NextResponse.json({ message: "Status berhasil diupdate" }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Gagal memproses webhook" }, { status: 500 });
  }
}