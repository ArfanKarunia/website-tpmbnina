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

  // LOGIKA GANTI GAMBAR (TETAP SAMA)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); 

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative w-full h-screen min-h-[600px] overflow-hidden">
      
      {/* 1. BACKGROUND SLIDESHOW (TETAP SAMA) */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
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

      {/* 2. OVERLAY GRADIENT (TETAP SAMA) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>

      {/* 3. KONTEN TEKS */}
      <div className={`relative z-20 flex flex-col justify-center h-full w-full px-6 md:px-12 lg:px-20`}>
        
        <div className="max-w-xl md:max-w-4xl pt-20"> 
          
          <Reveal>
            {/* === PENGATURAN UKURAN FONT === */}
            
            {/* JUDUL */}
            {/* text-3xl : Ukuran di HP (Kecil/Pas) */}
            {/* md:text-6xl : Ukuran di Laptop (Besar Kembali) */}
            <h1 className="text-3xl md:text-6xl font-bold text-white leading-tight mb-4 drop-shadow-md">
             {dict.title} 
            </h1>
          </Reveal>

          <Reveal delay={0.4}>
            {/* SUBTITLE */}
            {/* text-sm : Ukuran di HP (Kecil/Ringkas) */}
            {/* md:text-xl : Ukuran di Laptop (Besar/Jelas) */}
            <p className="text-sm md:text-xl text-gray-100 mb-8 max-w-lg md:max-w-2xl leading-relaxed drop-shadow-sm font-light">
             {dict.subtitle} 
            </p>
          </Reveal>

          <Reveal delay={0.6}>
            {/* TOMBOL (UKURAN JUGA MENYESUAIKAN) */}
            <Link
              href="#about"
              // px-6 py-3 (HP) -> md:px-8 md:py-4 (Laptop)
              className="inline-block bg-white text-[#1e293b] font-bold px-6 py-3 md:px-8 md:py-4 text-sm md:text-base rounded-full hover:bg-black hover:text-white transition-all duration-300 shadow-lg transform active:scale-95"
            >
             {dict.cta} 
            </Link>
          </Reveal>

        </div>
      </div>
    </section>
  );
}