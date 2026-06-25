"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Pastikan lucide-react terinstall

interface PartnerData {
  image_main: string;
  label_floating: string;
  label_box: string;
  content_title: string;
  desc: string;
  quote: string;
  person_name: string;
  person_title: string;
  person_image: string;
}

interface PartnerProps {
  dict: {
    title: string;
    partners: PartnerData[];
  };
}

export default function Partners({ dict }: PartnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fungsi Navigasi Slider
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === dict.partners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? dict.partners.length - 1 : prev - 1));
  };

  // Data partner yang sedang aktif
  const activePartner = dict.partners[currentIndex];

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- JUDUL UTAMA SECTION --- */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
            {dict.title}
          </h2>
          <div className="w-24 h-1 bg-gray-200 mx-auto rounded-full"></div>
        </div>

        {/* --- MAIN CONTENT (Dengan Animasi Transisi) --- */}
        <div 
          key={currentIndex} // Key ini memicu animasi ulang saat index berubah
          className="flex flex-col md:flex-row items-center gap-12 lg:gap-20 animate-in fade-in slide-in-from-right-8 duration-700"
        >
          {/* KIRI: Foto Gedung / Perusahaan */}
          <div className="w-full md:w-1/2 relative order-1">
            <div className="absolute -top-4 -left-4 w-full h-full border-2 rounded-3xl z-0 hidden md:block border-gray-100 transition-all duration-500"></div>

            <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl z-10 group">
              <Image
                src={activePartner.image_main}
                alt={activePartner.label_box}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>

              {/* GROUP LABEL POJOK KIRI BAWAH */}
              <div className="absolute bottom-6 left-6 z-20 flex flex-col items-start gap-2">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest ml-1 drop-shadow-md">
                  {activePartner.label_floating}
                </p>

                <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg border border-gray-100">
                  <p className="text-sm font-bold text-[#1e293b]">
                    {activePartner.label_box}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KANAN: Konten Cerita */}
          <div className="w-full md:w-1/2 order-2 flex flex-col h-full">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b] mb-4 leading-snug">
              {activePartner.content_title}
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 font-light">
              {activePartner.desc}
            </p>

            {/* WRAPPER QUOTE */}
            <div className="relative pl-6 border-l-4 border-blue-500 flex flex-col mb-8">
              <div className="max-h-[150px] overflow-y-auto pr-4 custom-scrollbar mb-6">
                <p className="text-lg text-gray-700 italic font-medium leading-relaxed">
                  "{activePartner.quote}"
                </p>
              </div>

              {/* INFO TOKOH */}
              <div className="flex items-center gap-4 mt-auto">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 bg-gray-100">
                  <Image
                    src={activePartner.person_image}
                    alt={activePartner.person_name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-gray-900">
                    {activePartner.person_name}
                  </h5>
                  <p className="text-xs text-blue-600 font-bold tracking-wide mt-0.5">
                    {activePartner.person_title}
                  </p>
                </div>
              </div>
            </div>

            {/* --- KONTROL NAVIGASI (PANAH & INDIKATOR) --- */}
            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
              {/* Indikator Titik (Dots) */}
              <div className="flex gap-2">
                {dict.partners.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}
                  />
                ))}
              </div>

              {/* Tombol Panah */}
              <div className="flex gap-3">
                <button 
                  onClick={prevSlide}
                  className="p-3 rounded-full border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={nextSlide}
                  className="p-3 rounded-full border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}