"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, FileText } from "lucide-react";
import { Reveal } from "./Reveal";

// Data Dummy
const researches = [
  {
    id: 1,
    category: "Jurnal Ilmiah",
    date: "12 Jan 2026",
    title: "Pengaruh Yoga Hamil Terhadap Pengurangan Nyeri Punggung Trimester III",
    excerpt: "Studi klinis mengenai efektivitas gerakan yoga prenatal dalam mengurangi keluhan nyeri punggung bawah pada ibu hamil usia kandungan 7-9 bulan.",
    link: "#"
  },
  {
    id: 2,
    category: "Artikel Edukasi",
    date: "05 Des 2025",
    title: "Pencegahan Stunting Dimulai dari 1000 Hari Pertama Kehidupan",
    excerpt: "Panduan lengkap nutrisi dan stimulasi anak sejak dalam kandungan hingga usia 2 tahun untuk mencegah risiko stunting.",
    link: "#"
  },
  {
    id: 3,
    category: "Studi Kasus",
    date: "20 Nov 2025",
    title: "Manajemen Kecemasan pada Ibu Primigravida Menjelang Persalinan",
    excerpt: "Pendekatan holistik menggunakan teknik relaksasi hypnobirthing untuk mengurangi tingkat kecemasan pada ibu yang baru pertama kali melahirkan.",
    link: "#"
  },
];

interface ResearchProps {
  dict: {
    section_title: string;
    section_desc: string;
    btn_text: string;
  }
}

export default function Research({ dict }: ResearchProps) {
  return (
    // REVISI 1: Ubah py-20 jadi py-12 atau py-16 biar jarak atas tidak kejauhan
    <section id="research" className="py-12 md:py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        
        {/* --- HEADER SECTION --- */}
        {/* REVISI 2: 
            - Tambah 'flex flex-col items-center' untuk memaksa centering secara layout
            - Ubah 'max-w-3xl' jadi 'max-w-2xl' biar teks deskripsi lebih ramping di tengah
        */}
        <div className="mb-12 max-w-2xl mx-auto text-center flex flex-col items-center">
          <Reveal>
            <div className="flex justify-center w-full mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider">
                <BookOpen size={14} />
                <span>Evidence Based Midwifery</span>
                </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 text-center">
              {dict.section_title}
            </h2>
          </Reveal>
          
          <Reveal delay={0.2}>
            <p className="text-slate-500 text-lg leading-relaxed text-center">
              {dict.section_desc}
            </p>
          </Reveal>
        </div>

        {/* --- GRID RISET --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {researches.map((item, idx) => (
            <Reveal key={item.id} delay={idx * 0.2}>
              <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 h-full flex flex-col">
                
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar size={12} />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 text-left">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 text-left">
                    {item.excerpt}
                  </p>
                </div>

                <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between group-hover:bg-blue-50/30 transition-colors">
                  <Link href={item.link} className="text-sm font-bold text-slate-700 flex items-center gap-2 group-hover:gap-3 transition-all group-hover:text-blue-600">
                    {dict.btn_text} <ArrowRight size={16} />
                  </Link>
                  <FileText size={18} className="text-slate-300 group-hover:text-blue-300" />
                </div>

              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}