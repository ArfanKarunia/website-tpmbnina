"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
      {/* Animasi Logo Berdetak (Pulse) */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.5,
          ease: "easeInOut"
        }}
        className="relative w-32 h-32 md:w-40 md:h-40 mb-6"
      >
        <Image 
          src="/assets/logoSIBIDAN.png" 
          alt="Loading SIBIDAN..."
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Teks Loading dengan Titik Animasi */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
          Sistem Informasi Bidan Andalan Nusantara
        </h2>
        <div className="flex items-center justify-center gap-1 mt-2 text-sm font-medium text-pink-500">
          <span>Menyiapkan ruang kerjamu</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
          >.</motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
          >.</motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
          >.</motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}