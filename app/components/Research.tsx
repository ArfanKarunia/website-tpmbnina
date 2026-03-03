"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, FileText } from "lucide-react";
import { Reveal } from "./Reveal";

interface Article {
  id: number;
  title: string;
  category: string;
  created_at: string;
  excerpt: string;
}

interface ResearchProps {
  dict: {
    section_title: string;
    section_desc: string;
    btn_text: string;
  };
  articles: Article[]; 
}

export default function Research({ dict, articles }: ResearchProps) {
  return (
    <section id="research" className="py-12 md:py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        
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

        {/* LOGIKA CENTERING JIKA CUMA 1 ARTIKEL */}
        <div className={
          articles && articles.length === 1 
            ? "flex justify-center w-full" // Jika cuma 1, taruh di tengah
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" // Jika banyak, pakai format grid
        }>
          {articles && articles.length > 0 ? (
            articles.map((item, idx) => (
              <div 
                key={item.id} 
                // Jika artikel cuma 1, batasi lebar kartunya agar tidak melar raksasa 1 layar penuh
                className={articles.length === 1 ? "w-full max-w-md" : ""}
              >
                <Reveal delay={idx * 0.1}>
                  <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 h-full flex flex-col">
                    
                    <div className="p-6 flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Calendar size={12} />
                          <span>{new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                      <Link href={`/article/${item.id}`} className="text-sm font-bold text-slate-700 flex items-center gap-2 group-hover:gap-3 transition-all group-hover:text-blue-600">
                        {dict.btn_text} <ArrowRight size={16} />
                      </Link>
                      <FileText size={18} className="text-slate-300 group-hover:text-blue-300" />
                    </div>

                  </div>
                </Reveal>
              </div>
            ))
          ) : (
            <div className="col-span-full w-full text-center text-gray-400 italic py-10">
              Belum ada artikel riset yang dipublikasikan.
            </div>
          )}
        </div>

      </div>
    </section>
  );
}