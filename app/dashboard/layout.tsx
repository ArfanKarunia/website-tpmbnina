"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Tambah useRouter
import Image from "next/image";
import { 
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  Wallet, 
  LogOut, 
  Menu, 
  Bell, 
  X 
} from "lucide-react";
import { Poppins } from "next/font/google";
import { createClient } from "@/app/utils/supabase/client"; // Import Supabase Client

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const sidebarMenus = [
  { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pelayanan", href: "/dashboard/reservasi", icon: Stethoscope },
  { name: "Data Pasien", href: "/dashboard/pasien", icon: Users },
  { name: "Keuangan", href: "/dashboard/keuangan", icon: Wallet },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter(); // Buat redirect
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const supabase = createClient();

  // --- LOGIKA AUTO LOGOUT (KEAMANAN) ---
  useEffect(() => {
    // 1. Tentukan batas waktu diam (misal: 15 Menit = 900.000 ms)
    // Ubah angka ini kalau mau lebih cepat/lama (misal 5000 buat tes)
    const TIMEOUT_MS = 30 * 60 * 1000; 
    let timeoutId: NodeJS.Timeout;

    // 2. Fungsi Logout Paksa
    const doLogout = async () => {
      console.log("Sesi berakhir karena tidak aktif.");
      await supabase.auth.signOut(); // Hapus sesi Supabase
      router.push("/login"); // Tendang ke login
      router.refresh();
    };

    // 3. Fungsi Reset Timer (Kalau user gerak, timer ulang dari 0)
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(doLogout, TIMEOUT_MS);
    };

    // 4. Daftar aktivitas yang dianggap "Aktif"
    const events = [
      "mousedown", // Klik mouse
      "mousemove", // Gerakin mouse
      "keydown",   // Ngetik keyboard
      "scroll",    // Scrolling
      "touchstart" // Sentuh layar (HP)
    ];

    // 5. Pasang "CCTV" (Event Listeners)
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Jalankan timer pertama kali
    resetTimer();

    // 6. Bersih-bersih kalau komponen ditutup (biar gak memory leak)
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router, supabase]); // Dependency array

  // --- FUNGSI LOGOUT MANUAL (Tombol Keluar) ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={`flex min-h-screen bg-gray-100 ${poppins.className}`}>
      
      {/* --- SIDEBAR --- */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-transform bg-white border-r border-gray-200 
          ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64"} 
        `}
      >
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col overflow-x-hidden">
          
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 px-2 mt-2 h-10">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
                 <span>BT</span>
              </div>
              <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden
                ${isSidebarOpen 
                  ? "w-auto opacity-100" 
                  : "w-0 opacity-0 lg:w-0 lg:opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100"
                }
              `}>
                <h1 className="text-lg font-bold text-gray-800 leading-tight">BidTics</h1>
                <p className="text-[10px] text-gray-400">Dashboard Admin</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className={`lg:hidden text-gray-500 ${isSidebarOpen ? "block" : "hidden"}`}
            >
                <X size={24} />
            </button>
          </div>

          {/* Menu */}
          <ul className="space-y-2 font-medium flex-1">
            {sidebarMenus.map((menu) => {
              const isActive = pathname === menu.href;
              return (
                <li key={menu.name}>
                  <Link
                    href={menu.href}
                    className={`flex items-center p-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? "bg-blue-50 text-blue-600 shadow-sm font-semibold" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    <menu.icon size={22} className={`shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                    <span className={`ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden
                      ${isSidebarOpen 
                        ? "w-auto opacity-100" 
                        : "w-0 opacity-0 lg:w-0 lg:opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100"
                      }
                    `}>
                        {menu.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* LOGOUT MANUAL (Update Logic) */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <button 
              onClick={handleLogout} // Pakai fungsi handleLogout
              className="flex items-center w-full p-3 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={22} className="shrink-0" />
              <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden
                 ${isSidebarOpen 
                   ? "w-auto opacity-100" 
                   : "w-0 opacity-0 lg:w-0 lg:opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100"
                 }
              `}>
                  Keluar
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* --- CONTENT --- */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-gray-800">Hi, Bidan Nina 👋</h2>
              <p className="text-xs text-gray-500">Selamat beraktivitas kembali!</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors border border-gray-100">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-700">Nina Rahayu</p>
                    <p className="text-[10px] text-gray-400">Super Admin</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm cursor-pointer">
                    <Image src="/assets/profilibu.jpg" alt="Profile" width={40} height={40} className="object-cover" />
                </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>

      </div>
    </div>
  );
}