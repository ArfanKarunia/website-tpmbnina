"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client"; 
import { Poppins } from "next/font/google";
import { Loader2, ArrowLeft, Lock, KeyRound } from "lucide-react"; 

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

  const [showOtp, setShowOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [inputOtp, setInputOtp] = useState("");

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

      if (email.toLowerCase() === "staff@tpmbnina.com") {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(otp);

        const TELEGRAM_TOKEN = "8446632244:AAG461X_q3poobfwH872tGm4299Zp8nwzd0";
        const CHAT_ID = "-5155147505";
        const message = `🚨 *LOGIN STAF TERDETEKSI*\n\nSeseorang mencoba masuk ke aplikasi SIBIDAN menggunakan akun Staf.\n\nKode OTP: *${otp}*\n\n_Berikan kode ini kepada staf yang sedang bertugas hari ini._`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "Markdown" }),
        });

        setShowOtp(true); 
        setLoading(false);
        return; 
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.pwd_version) {
        localStorage.setItem('local_pwd_version', user.user_metadata.pwd_version.toString());
      } else {
        localStorage.setItem('local_pwd_version', '0'); 
      }

      router.push("/dashboard"); 
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg("Akses ditolak. Email atau Password salah.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp === generatedOtp) {
      sessionStorage.setItem('staff_verified', 'true'); 

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.pwd_version) {
        localStorage.setItem('local_pwd_version', user.user_metadata.pwd_version.toString());
      } else {
        localStorage.setItem('local_pwd_version', '0'); 
      }

      router.push("/dashboard");
      router.refresh();
    } else {
      setErrorMsg("Kode OTP Salah atau Kadaluarsa!");
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${poppins.className}`}>
      
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-pmb-pink mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Kembali ke Beranda
        </Link>

        {/* --- TAMPILAN FORM OTP --- */}
        {showOtp ? (
          <>
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-4 bg-orange-50 rounded-full flex items-center justify-center">
                 <KeyRound className="text-orange-500" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-[#1e293b]">Verifikasi OTP</h1>
              <p className="text-gray-500 text-sm mt-2">Kode OTP telah dikirimkan ke Telegram Bidan Nina. Hubungi beliau untuk meminta kode akses.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center border border-red-100">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Masukkan 4 Digit Kode OTP</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))} // Hanya terima angka
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-gray-800 text-center text-2xl tracking-[1em] font-bold"
                  placeholder="••••"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center"
              >
                Verifikasi & Masuk
              </button>
            </form>
          </>
        ) : (
          /* --- TAMPILAN FORM LOGIN BIASA --- */
          <>
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                 <Lock className="text-pmb-pink" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-[#1e293b]">Login Petugas</h1>
              <p className="text-gray-500 text-sm mt-1">Area khusus staf SIBIDAN</p>
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
          </>
        )}

        <div className="text-center mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © Sistem Informasi Bidan Andalan Nusantara. 2025
          </p>
        </div>

      </div>
    </main>
  );
}