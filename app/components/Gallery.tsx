"use client";

import Image from "next/image";
import Link from "next/link";


interface GalleryProps {
  lang: "id" | "en";
  dict: {
    title: string;
    description: string;
    view_all: string;
  }
}

const galleryImages = [
  "/assets/galeri-1.jpg", 
  "/assets/galeri-2.jpg",
  "/assets/galeri-5.jpg",
  "/assets/galeri-4.jpg",
  "/assets/galeri-3.jpg",
];

export default function Gallery({ dict, lang }: GalleryProps) {
  return (
    <section id="gallery" className={`py-20 bg-gray-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
            {dict.title}
          </h2>
          <p className="text-gray-500">{dict.description}</p>
        </div>

        {/* BENTO GRID (Clean Version) */}
        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] md:h-[600px] mb-10">
          {galleryImages.map((src, index) => (
            <div 
              key={index} 
              // Logika: Jika index 0 (foto pertama), dia ambil 2 kolom & 2 baris. Sisanya biasa.
              className={`relative rounded-2xl overflow-hidden group ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <Image
                src={src}
                alt={`Galeri ${index + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Overlay Hover */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500"></div>
            </div>
          ))}
        </div>

        {/* LINK MINIMALIS */}
        <div className="text-center">
          <Link 
            href={`/${lang}/gallery`}
            className="group inline-flex items-center gap-2 text-gray-500 font-medium hover:text-[#ec4899] transition-colors duration-300"
          >
            <span className="text-sm tracking-wide">{dict.view_all}</span>
            {/* Ikon Panah (SVG Inline biar ringan) */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" height="20" viewBox="0 0 24 24" 
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              // Animasi: Panah geser ke kanan saat hover
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}