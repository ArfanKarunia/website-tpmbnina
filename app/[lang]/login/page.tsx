"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client"; 
import { Poppins } from "next/font/google";
import { Loader2, ArrowLeft, Lock } from "lucide-react"; 

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/dashboard"); 
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg("Akses ditolak. Email atau Password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${poppins.className}`}>
      
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-pmb-pink mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Kembali ke Beranda
        </Link>

        {/* Header Login */}
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
             {/* Karena login khusus karyawan, pakai icon Gembok/Kunci biar kesan private */}
             <Lock className="text-pmb-pink" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Login Petugas</h1>
          <p className="text-gray-500 text-sm mt-1">Area khusus staf TPMB Nina Rahayu</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Karyawan</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pmb-pink focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pmb-pink focus:ring-2 focus:ring-pink-100 outline-none transition-all text-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ec4899] hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} /> Memverifikasi...
              </>
            ) : (
              "Masuk ke Dashboard"
            )}
          </button>
        </form>

        {/* Footer Login (Hanya Copyright) */}
        <div className="text-center mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © Sistem Informasi Manajemen PMB Nina Rahayu
          </p>
        </div>

      </div>
    </main>
  );
}