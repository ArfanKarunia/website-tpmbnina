"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, Bell } from "lucide-react";
import { Poppins } from "next/font/google";
import Sidebar from "./Sidebar";
import { createClient } from "@/app/utils/supabase/client"; // Import Supabase

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State untuk menyimpan role dari database
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient();

  // Menarik role user saat layout dimuat
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          setUserRole(data.role);
        }
      }
    };
    fetchUserRole();
  }, [supabase]);

  // Variabel Dinamis berdasarkan Role
  const isOwner = userRole === "owner";
  const greetingName = isOwner ? "Bidan Nina" : "Staff TPMB";
  const profileName = isOwner ? "Bidan Nina" : "Staff TPMB Nina";
  const roleLabel = isOwner ? "Owner / Bidan" : "Staff Admin";

  return (
    <div className={`flex min-h-screen bg-gray-100 ${poppins.className}`}>
      
      {/* PANGGIL KOMPONEN SIDEBAR DI SINI */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* --- CONTENT UTAMA --- */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        
        {/* Header Dashboard */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              {/* GREETING DINAMIS */}
              <h2 className="text-lg font-bold text-gray-800">Hi, {greetingName} 👋</h2>
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
                    {/* NAMA PROFIL & ROLE DINAMIS */}
                    <p className="text-sm font-bold text-gray-700">{profileName}</p>
                    <p className="text-[10px] text-pink-500 font-bold uppercase">{roleLabel}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm cursor-pointer relative group">
                    <Image 
                    src="/assets/nina.jpg" 
                    alt="Profile" width={40} height={40} 
                    className="object-cover scale-[4.0] origin-[50%_60%] transition-transform duration-300" />
                </div>
            </div>
          </div>
        </header>

        {/* Child Pages */}
        <main className="p-6">
          {children}
        </main>

      </div>
    </div>
  );
}