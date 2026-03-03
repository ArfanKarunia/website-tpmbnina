"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Trash2, Plus, Save, Pencil, X } from "lucide-react";

export default function CMSResearchPage() {
  const supabase = createClient();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Mode Edit
  const [editingId, setEditingId] = useState<number | null>(null);

  // State Form
  const [formData, setFormData] = useState({
    title: "",
    category: "Artikel Edukasi",
    excerpt: "",
    content: ""
  });

  const fetchArticles = async () => {
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  // --- LOGIKA UTAMA (INSERT / UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // 1. MODE UPDATE
      const { error } = await supabase
        .from('articles')
        .update(formData) // Update data baru
        .eq('id', editingId); // Ke ID yang sedang diedit

      if (!error) {
        alert("Artikel berhasil diperbarui!");
        resetForm();
        fetchArticles();
      } else {
        alert("Gagal update: " + error.message);
      }

    } else {
      // 2. MODE INSERT (BARU)
      const { error } = await supabase.from('articles').insert([formData]);
      
      if (!error) {
        alert("Artikel baru berhasil ditambahkan!");
        resetForm();
        fetchArticles();
      } else {
        alert("Gagal simpan: " + error.message);
      }
    }
  };

  // Persiapan Edit: Tarik data ke form
  const handleEdit = (article: any) => {
    setEditingId(article.id);
    setFormData({
      title: article.title,
      category: article.category,
      excerpt: article.excerpt,
      content: article.content
    });
    // Scroll ke atas (Form) biar UX enak
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Yakin hapus artikel ini?")) return;
    await supabase.from('articles').delete().eq('id', id);
    fetchArticles();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ title: "", category: "Artikel Edukasi", excerpt: "", content: "" });
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Manajemen Riset & Artikel</h1>
      
      {/* FORM INPUT / EDIT */}
      <form onSubmit={handleSubmit} className={`mb-10 p-6 rounded-xl border transition-all duration-300 ${editingId ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-bold flex items-center gap-2 ${editingId ? 'text-yellow-700' : 'text-gray-700'}`}>
            {editingId ? <><Pencil size={18}/> Edit Artikel</> : <><Plus size={18}/> Tambah Artikel Baru</>}
          </h3>
          
          {/* Tombol Batal Edit */}
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">
              <X size={14}/> Batal Edit
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Judul</label>
            <input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Kategori</label>
            <select className="w-full p-2 border rounded-lg bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option>Artikel Edukasi</option>
              <option>Jurnal Ilmiah</option>
              <option>Studi Kasus</option>
              <option>Berita Kegiatan</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 mb-1">Ringkasan (Muncul di Depan)</label>
          <textarea required className="w-full p-2 border rounded-lg h-20 bg-white" maxLength={150} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} placeholder="Maksimal 150 karakter..." />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 mb-1">Isi Lengkap Artikel</label>
          <textarea required className="w-full p-2 border rounded-lg h-40 bg-white" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Tulis isi artikel lengkap di sini..." />
        </div>

        <div className="flex gap-3">
          <button type="submit" className={`px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2 transition-colors ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <Save size={18}/> {editingId ? "Update Perubahan" : "Publish Artikel"}
          </button>
          
          {editingId && (
             <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg font-bold text-gray-500 bg-white border border-gray-300 hover:bg-gray-100">
               Batal
             </button>
          )}
        </div>
      </form>

      {/* LIST ARTIKEL */}
      <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
        <span>📚 Daftar Artikel Tayang</span>
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{articles.length}</span>
      </h3>
      
      <div className="space-y-3">
        {loading ? <p className="text-gray-400 italic">Memuat data...</p> : articles.map((art) => (
          <div key={art.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors ${editingId === art.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100'}`}>
            
            <div className="mb-3 md:mb-0">
              <h4 className="font-bold text-gray-800 line-clamp-1">{art.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{art.category}</span>
                <span className="text-xs text-gray-400">• {new Date(art.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {/* TOMBOL EDIT */}
              <button 
                onClick={() => handleEdit(art)} 
                className="flex items-center gap-1 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold" 
                title="Edit Data"
              >
                <Pencil size={14}/> Edit
              </button>

              {/* TOMBOL HAPUS */}
              <button 
                onClick={() => handleDelete(art.id)} 
                className="flex items-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold" 
                title="Hapus Permanen"
              >
                <Trash2 size={14}/> Hapus
              </button>
            </div>

          </div>
        ))}
        
        {articles.length === 0 && !loading && (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
            Belum ada artikel. Silakan tambah baru di atas.
          </div>
        )}
      </div>
    </div>
  );
}