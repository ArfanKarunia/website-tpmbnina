"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { 
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  Wallet, 
  Pill,
  Import,
  ClipboardList,
  LogOut, 
  X,
  ShieldCheck 
} from "lucide-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const handleLogout = async () => {
    sessionStorage.removeItem("staff_verified");
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const mainMenus = [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pelayanan", href: "/dashboard/pelayanan", icon: Stethoscope },
    { name: "Data Pasien", href: "/dashboard/pasien", icon: Users },
    { name: "Keuangan", href: "/dashboard/keuangan", icon: Wallet },
    { name: "Stok Obat",  href: "/dashboard/obat", icon: Pill },
    { name: "Import Riset",  href: "/dashboard/cms/research", icon: Import },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 z-50 h-screen transition-transform bg-white border-r border-gray-200 
        ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0 lg:w-20"} 
      `}
    >
      <div className={`h-full px-3 py-4 flex flex-col ${isSidebarOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-visible"}`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between mb-8 px-2 mt-2 h-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
               <Image 
                 src="/assets/logoSIBIDAN.png" 
                 alt="Logo SIBIDAN"
                 fill
                 className="object-contain"
                 priority
               />
            </div>
            <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden
              ${isSidebarOpen 
                ? "w-auto opacity-100" 
                : "w-0 opacity-0 lg:w-0 lg:opacity-0 lg:group-hover:w-auto lg:group-hover:opacity-100"
              }
            `}>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">SIBIDAN</h1>
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

        {/* Menu Navigasi */}
        <ul className="space-y-2 font-medium flex-1">
          {mainMenus.map((menu) => {
            const isActive = pathname === menu.href;
            return (
              <li key={menu.name} className="relative group">
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
                    ${isSidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}
                  `}>
                      {menu.name}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="relative group mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/dashboard/data-usg"
              className={`flex items-center p-3 rounded-xl transition-all duration-200
                ${pathname.includes("/dashboard/data-usg") ? "bg-pink-50 text-pink-600 shadow-sm font-semibold" : "text-gray-500 hover:bg-pink-50 hover:text-pink-600"}
              `}
            >
              <ClipboardList size={22} className={`shrink-0 ${pathname.includes("/dashboard/data-usg") ? "text-pink-600" : "text-gray-400"}`} />
              <span className={`ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}`}>
                  Data USG
              </span>
            </Link>
          </li>

          {userRole === "owner" && (
            <>
              <li className="relative group">
                <Link
                  href="/dashboard/keuangan-usg"
                  className={`flex items-center p-3 rounded-xl transition-all duration-200
                    ${pathname.includes("/dashboard/keuangan-usg") ? "bg-pink-50 text-pink-600 shadow-sm font-semibold" : "text-gray-500 hover:bg-pink-50 hover:text-pink-600"}
                  `}
                >
                  <Wallet size={22} className={`shrink-0 ${pathname.includes("/dashboard/keuangan-usg") ? "text-pink-600" : "text-gray-400"}`} />
                  <span className={`ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}`}>
                      Keuangan USG
                  </span>
                </Link>
              </li>

              <li className="relative group">
                <Link
                  href="/dashboard/kelola-staff"
                  className={`flex items-center p-3 rounded-xl transition-all duration-200
                    ${pathname.includes("/dashboard/kelola-staff") ? "bg-pink-50 text-pink-600 shadow-sm font-semibold" : "text-gray-500 hover:bg-pink-50 hover:text-pink-600"}
                  `}
                >
                  <ShieldCheck size={22} className={`shrink-0 ${pathname.includes("/dashboard/kelola-staf") ? "text-pink-600" : "text-gray-400"}`} />
                  <span className={`ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}`}>
                      Kelola Staf
                  </span>
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* LOGOUT MANUAL */}
        <div className="mt-auto pt-4 border-t border-gray-100 group relative">
          <button 
            onClick={handleLogout}
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
  );
}