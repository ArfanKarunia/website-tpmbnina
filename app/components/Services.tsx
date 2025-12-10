"use client";

import Image from "next/image";
import { Poppins } from "next/font/google";
// Import motion langsung, JANGAN pakai Reveal biar layout gak geser
import { motion } from "framer-motion"; 

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const services = [
  {
    title: "USG 2D, 3D, 4D",
    desc: "Melayani USG dengan berbagai tipe (2D, 3D, 4D) oleh Dokter yang Bersertifikat untuk memantau perkembangan janin secara detail.",
    image: "/assets/usg.jpg", 
  },
  {
    title: "Kesehatan Ibu & Anak",
    desc: "Melayani Pemeriksaan Kesehatan Ibu dan Anak dengan pendekatan profesional, mulai dari kehamilan hingga tumbuh kembang balita.",
    image: "/assets/pemeriksaan.jpg", 
    setting: {
      position: "object-[center_40%]", 
      zoom: "scale-100",
    }
  },
  {
    title: "Keluarga Berencana (KB)",
    desc: "Melayani konsultasi dan pemasangan alat kontrasepsi KB (Suntik, Pil, Implan, IUD) sesuai kebutuhan keluarga.",
    image: "/assets/kb.jpg", 
  },
];

export default function Services() {
  return (
    <section className={`py-20 bg-gray-50 ${poppins.className}`}>
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
              Layanan Kami
            </h2>
            <div className="w-20 h-1 bg-pmb-pink mx-auto rounded-full"></div>
          </motion.div>
        </div>

        {/* GRID KARTU (Layout DIJAMIN Aman) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {services.map((item, index) => (
            
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 50 }} // Mulai: Transparan & agak bawah
              whileInView={{ opacity: 1, y: 0 }} // Akhir: Muncul & naik
              transition={{ duration: 0.5, delay: index * 0.2 }} // Delay berurutan (Staggered)
              viewport={{ once: true }} // Animasi cuma sekali
              
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group border border-gray-100 flex flex-col h-full"
            >
              {/* Bagian Gambar */}
              <div className="relative h-64 w-full overflow-hidden shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className={`object-cover transition-transform duration-500 group-hover:scale-110 
                    ${item.setting?.position || "object-center"} 
                    ${item.setting?.zoom || ""}
                  `}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
              </div>
              
              {/* Bagian Teks */}
              <div className="p-8 text-center grow">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-pmb-pink transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}