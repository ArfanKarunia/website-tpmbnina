"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Menu, X } from "lucide-react"; 
import { Archivo_Black, Poppins } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";

const archivo = Archivo_Black({ 
  weight: "400", 
  subsets: ["latin"],
  display: "swap",
});


// 1. DEFINISIKAN TIPE DATA DICT (Props)
interface NavbarProps {
  lang: "id" | "en";
  dict: {
    home: string;
    about: string;
    gallery: string;
    contact: string;
    login: string;
  };
}

// 2. TERIMA PROPS DI KOMPONEN
export default function Navbar({ lang, dict }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  // 3. BUAT NAVLINKS DINAMIS (Berdasarkan dict yang diterima)
  const navLinks = [
    { name: dict.home, href: "#home" },       // Pakai dict.home
    { name: dict.about, href: "#about" },     // Pakai dict.about
    { name: dict.gallery, href: "#gallery" }, // Pakai dict.gallery
    { name: dict.contact, href: "#contact" }, // Pakai dict.contact
  ];

  // Logic Ganti Bahasa
  const changeLanguage = (newLang: string) => {
    if (newLang === lang) return;
    const segments = pathname.split("/"); 
    // Handle root path
    if (segments.length < 2) {
         router.push(`/${newLang}`);
         return;
    }
    segments[1] = newLang; 
    const newPath = segments.join("/");
    router.push(newPath);
  };

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string) => {
    e.preventDefault(); 
    setIsOpen(false);
    const targetId = href.replace("#", "");
    const elem = document.getElementById(targetId);
    if (elem) {
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;
      const headerOffset = 80; 
      window.scrollTo({
        top: offsetPosition - headerOffset,
        behavior: "smooth"
      });
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md py-2" : "bg-transparent py-6"
      }`}
    >

      <div className="w-full px-6 md:px-12 lg:px-20"> 
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <div className="shrink-0 flex items-center z-50">
            <Link 
              href={`/${lang}`} // Link logo balik ke home sesuai bahasa
              className={`${archivo.className} text-xl md:text-2xl tracking-wider transition-colors duration-300 ${
                scrolled ? " text-[#1e293b]" : "text-white drop-shadow-md"
              }`}
            >
              TPMB NINA RAHAYU
            </Link>
          </div>

          {/* MENU DESKTOP */}
          <div className="hidden md:flex items-center gap-6 ml-auto">
            
            <div className="flex gap-6 mr-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={`text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer ${
                    scrolled 
                      ? "text-gray-600 hover:text-pmb-pink hover:-translate-y-0.5"
                      : "text-white/90 hover:text-pmb-pink hover:scale-105 drop-shadow-sm"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* PEMISAH */}
            <div className={`h-6 w-px ${scrolled ? "bg-gray-300" : "bg-white/40"}`}></div>

            {/* LANGUAGE SWITCHER */}
            <div className={`flex items-center gap-1 text-xs font-bold ${scrolled ? "text-gray-600" : "text-white"}`}>
              <button 
                onClick={() => changeLanguage("id")}
                className={`px-1 hover:scale-105 transition-colors ${lang === 'id' ? "text-pmb-pink underline decoration-2 underline-offset-4" : ""}`}
              >
                ID
              </button>
              <span>/</span>
              <button 
                onClick={() => changeLanguage("en")}
                className={`px-1 hover:scale-105 transition-colors ${lang === 'en' ? "text-pmb-pink underline decoration-2 underline-offset-4" : ""}`}
              >
                EN
              </button>
            </div>

            {/* LOGIN ICON */}
            <Link
              href={`/${lang}/login`} // Arahkan login sesuai bahasa
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                 scrolled ? "hover:bg-gray-100" : "hover:bg-white/20" 
              }`}
            >
               <Image 
                 src="/assets/user.svg" 
                 alt="Login User"
                 width={24} 
                 height={24}
                 className={`transition-all duration-300 ${scrolled ? "" : "brightness-0 invert"}`} 
               />
            </Link>
          </div>

          {/* MENU MOBILE TOGGLE */}
          <div className="md:hidden flex items-center gap-4 ml-auto">
             <div className={`flex items-center gap-1 text-xs font-bold mr-2 ${scrolled ? "text-gray-600" : "text-white"}`}>
                <button onClick={() => changeLanguage("id")} className={lang === 'id' ? "text-pmb-pink" : ""}>ID</button>
                <span>|</span>
                <button onClick={() => changeLanguage("en")} className={lang === 'en' ? "text-pmb-pink" : ""}>EN</button>
             </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`focus:outline-none transition-colors ${
                scrolled ? "text-gray-600 hover:text-pmb-pink" : "text-white hover:text-pmb-pink"
              }`}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* DROPDOWN (Mobile) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg top-full left-0">
          <div className={`px-4 pt-2 pb-6 space-y-2`}>
            
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-pmb-pink hover:bg-pink-50 transition-colors cursor-pointer"
              >
                {link.name}
              </Link>
            ))}
            
            <div className="border-t border-gray-100 my-2"></div>

             <Link
                href={`/${lang}/login`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-3 font-medium text-pmb-pink hover:bg-pink-50 rounded-md transition-colors"
              >
                <Image src="/assets/user.svg" alt="user" width={20} height={20} />
                {dict.login} 
              </Link>
          </div>
        </div>
      )}
    </nav>
  );
}