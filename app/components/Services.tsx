"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface ServiceItem {
  title: string;
  desc: string;
}

interface ServicesProps {
  dict: {
    title: string;
    items: ServiceItem[];
    cta: string;
  }
}

export default function Services({ dict }: ServicesProps) {
  
  // --- DATA GAMBAR STATIS ---
  // Urutannya WAJIB sama dengan urutan teks di JSON (1. ANC, 2. Ibu Anak, 3. KB)
  const images = [
    {
      src: "/assets/pemeriksaan.jpg",
      setting: "object-[center_40%]" // Custom focus
    },
    {
      src: "/assets/usg.webp",
      setting: "object-center"
    },
    {
      src: "/assets/kb.jpg",
      setting: "object-center"
    }
  ];

  return (
    <section id="services" className={`py-20 bg-gray-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* JUDUL */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
              {dict.title}
            </h2>
          </motion.div>
        </div>

        {/* GRID KARTU */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {dict.items.map((item, index) => {
            // Cek apakah judul mengandung kata "usg" (huruf besar/kecil tidak masalah)
            const isUsgService = item.title.toLowerCase().includes("usg");

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 50 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5, delay: index * 0.2 }} 
                viewport={{ once: true }} 
                
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group border border-gray-100 flex flex-col h-full"
              >
                {/* Bagian Gambar */}
                <div className="relative h-64 w-full overflow-hidden shrink-0">
                  <Image
                    src={images[index]?.src || "/assets/placeholder.jpg"} 
                    alt={item.title}
                    fill
                    className={`object-cover transition-transform duration-500 group-hover:scale-110 
                      ${images[index]?.setting || "object-center"}
                    `}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
                </div>
                
                {/* Bagian Teks (Dari Dict) */}
                <div className="p-8 text-center grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#ec4899] transition-colors">
                    {item.title}
                  </h3>
                  <p className={`text-gray-600 text-sm leading-relaxed ${isUsgService ? "mb-6" : ""}`}>
                    {item.desc}
                  </p>

                  {/* Tombol CTA Khusus Layanan USG */}
                  {isUsgService && (
                    <div className="mt-auto pt-2">
                      <Link 
                        href="https://tpmbnina.com/id/reservasi-usg"
                        className="inline-block bg-[#ec4899] hover:bg-pink-600 text-white text-sm font-bold py-3 px-8 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                        {dict.cta}
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}