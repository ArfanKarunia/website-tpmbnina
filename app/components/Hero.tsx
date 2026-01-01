"use client"; 

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal"; 
import { motion, AnimatePresence } from "framer-motion"; 


interface HeroProps {
  dict: {
    title: string;
    subtitle: string;
    cta: string;
  }
}

const heroImages = [
  "/assets/hero-bg.jpg",   
  "/assets/hero-bg1.jpg", 
];

export default function Hero({dict}: HeroProps) {
  const [index, setIndex] = useState(0);

  // LOGIKA GANTI GAMBAR OTOMATIS
  useEffect(() => {
    const timer = setInterval(() => {
      // Pindah ke index berikutnya. Kalau sudah terakhir, balik ke 0.
      setIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); // Ganti gambar setiap 5000ms (5 detik)

    return () => clearInterval(timer); // Bersihkan timer saat komponen dicopot
  }, []);

  return (
    <section id="home" className="relative w-full h-screen min-h-[600px] overflow-hidden">
      
      {/* 1. BACKGROUND SLIDESHOW */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence initial={false}>
          <motion.div
            key={index} // Kunci animasi: saat index berubah, animasi jalan
            initial={{ opacity: 0 }}      // Awal: Transparan
            animate={{ opacity: 1 }}      // Masuk: Muncul
            exit={{ opacity: 0 }}         // Keluar: Memudar
            transition={{ duration: 1.5 }} // Durasi fade 1.5 detik (Smooth)
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={heroImages[index]}
              alt={`Slide ${index + 1}`}
              fill
              priority
              className="object-cover object-center scale-105"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* OVERLAY HITAM */}
      {/* Tetap ditaruh disini supaya teks tetap terbaca walau gambar ganti-ganti */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* 2. KONTEN TEKS */}
      <div className={`relative z-20 flex flex-col justify-center h-full w-full px-6 md:px-12 lg:px-20`}>
        
        <div className="max-w-4xl pt-20"> 
          
          <Reveal>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-md">
             {dict.title} 
            </h1>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-2xl leading-relaxed drop-shadow-sm font-light">
             {dict.subtitle} 
            </p>
          </Reveal>

          <Reveal delay={0.6}>
            <Link
              href="#about"
              className="inline-block bg-white text-[#1e293b] font-bold px-8 py-3.5 rounded-full hover:bg-black hover:text-white transition-all duration-300 shadow-lg transform"
            >
             {dict.cta} 
            </Link>
          </Reveal>

        </div>
      </div>
    </section>
  );
}