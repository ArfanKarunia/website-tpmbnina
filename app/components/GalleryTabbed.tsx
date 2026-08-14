"use client";

import { useState } from "react";
import Image from "next/image";
import { LayoutGrid, Activity, Stethoscope, HeartPulse, Baby, GraduationCap, User } from "lucide-react";

// --- STRUKTUR DATA FOTO ---
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
  { id: "kehamilan", label: "Kehamilan", icon: HeartPulse },
  { id: "anc", label: "Persalinan", icon: Activity },
  { id: "bayi", label: "Bayi Balita", icon: Baby },
  { id: "kb", label: "Keluarga Berencana", icon: User },
  { id: "bimbingan", label: "Bimbingan Mahasiswa", icon: GraduationCap },
];

export default function GalleryTabbed() {
  const [activeTab, setActiveTab] = useState("all");

  // Filter foto berdasarkan tab yang aktif
  const filteredImages = activeTab === "all" 
    ? galleryData 
    : galleryData.filter(img => img.category === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* --- GRID TAB BUTTONS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all duration-300 text-sm md:text-base font-medium
                ${isActive 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- GRID HASIL FOTO --- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-in fade-in duration-500">
        {filteredImages.map((img, index) => (
          <div 
            key={`${activeTab}-${index}`} // Key dinamis agar ada animasi saat pindah tab
            className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 aspect-[4/3] group"
          >
            <Image 
              src={img.src} 
              alt={`Galeri ${tabs.find(t => t.id === activeTab)?.label} - ${index + 1}`} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            {/* Overlay Halus */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
          </div>
        ))}
      </div>
      
      {filteredImages.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          Belum ada foto di kategori ini.
        </div>
      )}

    </div>
  );
}