import { createClient } from "@/app/utils/supabase/server"; 
import { notFound } from "next/navigation"; 
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";

export const revalidate = 0; 

interface ArticleDetailProps {
  params: Promise<{ id: string }>; 
}

export default async function ArticleDetail({ params }: ArticleDetailProps) {
  const { id } = await params;
  const supabase = await createClient(); 
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) return <div className="text-center py-20 text-slate-500">Artikel tidak ditemukan.</div>;

  return (
    <main className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-8 md:p-12 border-b border-slate-100">
          <Link href="/#research" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Link>
          
          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
              {article.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              {/* Pastikan tanggal valid sebelum format */}
              <span>{new Date(article.created_at).toLocaleDateString("id-ID", { dateStyle: 'long' })}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>Oleh Admin</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 prose prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>

      </div>
    </main>
  );
}