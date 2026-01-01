"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface FloatingWhatsAppProps {
  dict: {
    text: string;
  }
}

export default function FloatingWhatsApp({dict}: FloatingWhatsAppProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Logic: Tombol baru muncul setelah user scroll sedikit ke bawah (misal 100px)
  // Supaya tidak menutupi konten Hero Section di awal.
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          // Posisi Fixed di Pojok Kanan Bawah
          className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
          
          // Animasi Masuk (Pop Up) & Keluar
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Tooltip Kecil (Opsional - biar makin ramah) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }} // Muncul telat dikit
            className="bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md mb-1 mr-1 whitespace-nowrap"
          >
           {dict.text}
          </motion.div>

          {/* Tombol Utama */}
          <Link
            href="https://wa.me/6281335830986?text=Halo%20Bidan%20Nina,%20saya%20ingin%20konsultasi%20mengenai%20layanan%20kesehatan."
            target="_blank"
            className="relative group"
          >
            {/* Lingkaran Hijau WA */}
            <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-shadow duration-300">
              <Image
                src="/assets/logo-whatsapp.png" 
                alt="WhatsApp"
                width={35}
                height={35}
                className="object-contain"
              />
            </div>

            {/* Efek Ping (Denyut) - Biar kelihatan hidup */}
            <span className="absolute -bottom-0.5 -top-0.5 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}