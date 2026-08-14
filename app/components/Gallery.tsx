"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Stethoscope, Activity, HeartPulse, Baby, GraduationCap, User, LayoutGrid } from "lucide-react";

interface GalleryProps {
  lang: "id" | "en";
  dict: {
    title: string;
    description: string;
    view_all: string;
  }
}

// --- STRUKTUR DATA FOTO (DENGAN KATEGORI) ---
const galleryData = [
  { src: "/assets/galeri-1.jpg", category: "fasilitas" },
  { src: "/assets/galeri-2.jpg", category: "fasilitas" },
  { src: "/assets/galeri-3.jpg", category: "fasilitas" },
  { src: "/assets/galeri-4.jpg", category: "fasilitas" },
  { src: "/assets/galeri-5.jpg", category: "fasilitas" },
  
  { src: "/assets/pict1.jpg", category: "anc" },
  { src: "/assets/pict2.jpg", category: "anc" },
  { src: "/assets/pict3.jpg", category: "anc" },
  { src: "/assets/pict4.jpg", category: "anc" },
  { src: "/assets/pict5.jpg", category: "anc" },
  
  { src: "/assets/pict6.jpg", category: "bayi" },
  { src: "/assets/pict7.jpg", category: "bayi" },
  { src: "/assets/pict8.jpg", category: "bayi" },
  { src: "/assets/pict9.jpg", category: "bayi" },
  { src: "/assets/pict10.jpg", category: "bayi" },
  { src: "/assets/pict11.jpg", category: "bayi" },
];

// --- MENU TAB (KATEGORI) ---
const tabs = [
  { id: "all", label: "Pelayanan USG", icon: Stethoscope },
  { id: "fasilitas", label: "Fasilitas PMB", icon: Activity },
  { id: "anc", label: "Kehamilan & Persalinan", icon: HeartPulse },
  { id: "bayi", label: "Bayi & Balita", icon: Baby },
  { id: "kb", label: "Keluarga Berencana", icon: User },
  { id: "bimbingan", label: "Kegiatan PKL", icon: GraduationCap },
];

export default function Gallery({ dict, lang }: GalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Filter foto berdasarkan tab yang aktif
  const filteredImages = activeTab === "all" 
    ? galleryData 
    : galleryData.filter(img => img.category === activeTab);

  // Fungsi untuk ganti tab & mereset posisi scroll ke kiri
  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (scrollRef.current) {
      // Gulir perlahan kembali ke posisi awal (kiri) saat ganti kategori
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Sensor Horizontal Scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Abaikan jika user men-scroll secara horizontal bawaan (misal pakai Trackpad)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const isAtRightEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
      const isAtLeftEnd = container.scrollLeft <= 0;

      // Jika scroll ke BAWAH dan galeri BELUM mentok kanan
      if (e.deltaY > 0 && !isAtRightEnd) {
        e.preventDefault(); 
        container.scrollLeft += e.deltaY; 
      } 
      // Jika scroll ke ATAS dan galeri BELUM mentok kiri
      else if (e.deltaY < 0 && !isAtLeftEnd) {
        e.preventDefault(); 
        container.scrollLeft += e.deltaY; 
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <section id="gallery" className="py-20 bg-gray-50 overflow-hidden relative">
      
      {/* Trik CSS untuk menyembunyikan scrollbar bawaan browser tapi tetap bisa di-scroll */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        {/* HEADER */}
        <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-3">
              {dict.title}
            </h2>
            <p className="text-gray-500 max-w-2xl">{dict.description}</p>
          </div>
          {/* Instruksi visual kecil untuk user */}
          <div className="hidden md:flex items-center gap-2 text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-full">
            <span>Scroll untuk melihat</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>

        {/* TABS (KATEGORI) */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 w-full snap-x">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full border whitespace-nowrap transition-all duration-300 text-sm font-bold snap-start
                  ${isActive 
                    ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                  }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* HORIZONTAL SCROLL CONTAINER */}
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing px-4 sm:px-6 lg:px-8 pb-10"
      >
        {filteredImages.length > 0 ? (
          /* GRID 2 BARIS */
          <div className="grid grid-rows-2 grid-flow-col gap-4 w-max animate-in fade-in slide-in-from-right-4 duration-500">
            {filteredImages.map((img, index) => (
              <div 
                key={`${activeTab}-${index}`} 
                className="relative w-[260px] md:w-[320px] h-[180px] md:h-[220px] rounded-2xl overflow-hidden group bg-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <Image
                  src={img.src}
                  alt={`Galeri TPMB Nina Rahayu ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 260px, 320px"
                />
                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
              </div>
            ))}
          </div>
        ) : (
          /* FALLBACK KOSONG */
          <div className="w-full h-[376px] md:h-[456px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl animate-in fade-in duration-500 mx-auto max-w-7xl">
            <div className="text-center text-gray-400">
              <LayoutGrid size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada foto di kategori ini.</p>
            </div>
          </div>
        )}
      </div>
      
    </section>
  );
}