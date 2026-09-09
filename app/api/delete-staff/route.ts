import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Environment variable hilang." }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SERVICE_ROLE_KEY
    );

    // Hapus user dari Supabase Auth secara permanen
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteAuthError) throw deleteAuthError;

    // Hapus juga dari tabel profiles (opsional jika kamu belum menyalakan fitur Delete Cascade)
    await supabaseAdmin.from("profiles").delete().eq("id", uid);

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus!" });
    
  } catch (error: any) {
    console.error("API SERVER ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}