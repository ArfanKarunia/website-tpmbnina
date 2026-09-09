import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { uid, newPassword } = await request.json();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Environment variable Supabase Service Role Key hilang. Pastikan .env.local sudah benar." }, { status: 500 });
    }

    // Menggunakan SERVICE_ROLE_KEY untuk bypass RLS (Mode Admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SERVICE_ROLE_KEY
    );

    // Paksa update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      uid,
      { password: newPassword }
    );
    
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Password berhasil diubah!" });
    
  } catch (error: any) {
    console.error("API SERVER ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}