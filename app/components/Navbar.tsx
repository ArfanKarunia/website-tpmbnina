"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { Menu, X } from "lucide-react"; 
import { Archivo_Black, Poppins } from "next/font/google";

const archivo = Archivo_Black({ 
  weight: "400", 
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({ 
  weight: ["400", "500", "600"], 
  subsets: ["latin"],
  display: "swap",
});

const navLinks = [
  { name: "Beranda", href: "#home" },
  { name: "Tentang", href: "#about" },
  { name: "Galeri", href: "#gallery" },
  { name: "Lokasi & Kontak", href: "#contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Logic Scroll tetap sama
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
      {/* REVISI DISINI: 
          - Hapus 'max-w-7xl mx-auto' (Ini yang bikin konten ketengah)
          - Ganti 'w-full' (Biar lebar full)
          - Tambah padding 'px-6 md:px-12 lg:px-20' biar logo gak nempel banget ke pinggir layar
      */}
      <div className="w-full px-6 md:px-12 lg:px-20"> 
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <div className="shrink-0 flex items-center z-50">
            <Link 
              href="/" 
              className={`${archivo.className} text-xl md:text-2xl tracking-wider transition-colors duration-300 ${
                scrolled ? " text-[#1e293b]" : "text-white drop-shadow-md"
              }`}
            >
              TPMB NINA RAHAYU
            </Link>
          </div>

          {/* MENU DESKTOP */}
          <div className="hidden md:flex items-center gap-8 ml-auto">
            <div className="flex gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className={`${poppins.className} text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer ${
                    scrolled 
                      ? "text-gray-600 hover:text-pmb-pink hover:-translate-y-0.5"
                      : "text-white/90 hover:text-pmb-pink hover:scale-105 drop-shadow-sm"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Login Icon */}
            <Link
              href="/login"
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

          {/* MENU MOBILE */}
          <div className="md:hidden flex items-center gap-4 ml-auto">
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

      {/* DROPDOWN (Mobile tetap sama) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg top-full left-0">
          <div className={`px-4 pt-2 pb-6 space-y-2 ${poppins.className}`}>
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
             <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-3 font-medium text-pmb-pink hover:bg-pink-50 rounded-md transition-colors"
              >
                <Image src="/assets/user.svg" alt="user" width={20} height={20} />
                Login Petugas
              </Link>
          </div>
        </div>
      )}
    </nav>
  );
}