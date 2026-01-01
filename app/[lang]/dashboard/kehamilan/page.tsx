"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, 
  Baby, 
  Calendar, 
  Heart, 
  MessageCircle, 
  AlertTriangle,
  ArrowLeft,
  FileText // Icon Detail
} from "lucide-react";
import Link from "next/link";
import AncHistoryModal from "./AncHistoryModal"; // Import Modal Baru

interface PregnantMom {
  id: string;
  name: string;
  address: string;
  phone: string;
  hpht: string;
  husband_name?: string;
  // Calculated fields
  hpl?: string;
  uk?: number; 
  trimester?: number;
  status?: string;
}

export default function KehamilanPage() {
  const supabase = createClient();
  const [moms, setMoms] = useState<PregnantMom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTri, setFilterTri] = useState("all"); 

  // STATE UNTUK MODAL HISTORY
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedMom, setSelectedMom] = useState<{id: string, name: string} | null>(null);

  // --- HELPER: RUMUS KEHAMILAN ---
  const calculatePregnancy = (hphtDate: string) => {
      const hpht = new Date(hphtDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - hpht.getTime());
      const weeks = Math.floor(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 7);
      
      const hplDate = new Date(hpht);
      hplDate.setDate(hplDate.getDate() + 280);
      
      let trimester = 1;
      let status = "Aman";
      
      if (weeks > 13 && weeks <= 27) trimester = 2;
      else if (weeks > 27) {
          trimester = 3;
          status = weeks >= 37 ? "Siaga" : "Pantau";
      }

      return { 
          uk: weeks, 
          hpl: hplDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 
          status, 
          trimester 
      };
  };

  useEffect(() => {
    const fetchMoms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .not("hpht", "is", null)
        .order("hpht", { ascending: true }); 

      if (error) console.error(error);
      
      if (data) {
          const processed = data.map((p) => {
              const calc = calculatePregnancy(p.hpht);
              return {
                  ...p,
                  hpl: calc.hpl,
                  uk: calc.uk,
                  trimester: calc.trimester,
                  status: calc.status
              };
          });
          setMoms(processed);
      }
      setLoading(false);
    };

    fetchMoms();
  }, []);

  // --- FILTER LOGIC ---
  const filteredMoms = moms.filter((mom) => {
      const matchSearch = mom.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchFilter = true;
      if (filterTri === 't1') matchFilter = mom.trimester === 1;
      if (filterTri === 't2') matchFilter = mom.trimester === 2;
      if (filterTri === 't3') matchFilter = mom.trimester === 3;
      if (filterTri === 'risk') matchFilter = (mom.uk || 0) >= 37; 
      return matchSearch && matchFilter;
  });

  // Handler Buka Modal
  const handleOpenHistory = (mom: PregnantMom) => {
      setSelectedMom({ id: mom.id, name: mom.name });
      setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20}/></Link>
             <h1 className="text-2xl font-bold text-gray-800">Data Kehamilan (ANC)</h1>
          </div>
          <p className="text-gray-500 text-sm ml-7">Monitor perkembangan ibu hamil, HPL, dan resiko.</p>
        </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div onClick={() => setFilterTri('all')} className={`cursor-pointer p-4 rounded-xl border ${filterTri === 'all' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white border-pink-100 hover:border-pink-300'}`}>
              <span className="block text-xs opacity-80">Total Bumil</span>
              <span className="text-2xl font-bold">{moms.length}</span>
          </div>
          <div onClick={() => setFilterTri('risk')} className={`cursor-pointer p-4 rounded-xl border ${filterTri === 'risk' ? 'bg-red-500 text-white border-red-500' : 'bg-white border-red-100 hover:border-red-300'}`}>
              <span className="block text-xs opacity-80">Siaga (37+ Mgu)</span>
              <span className={`text-2xl font-bold ${filterTri === 'risk' ? 'text-white' : 'text-red-500'}`}>
                  {moms.filter(m => (m.uk || 0) >= 37).length}
              </span>
          </div>
          <div onClick={() => setFilterTri('t1')} className={`cursor-pointer p-4 rounded-xl border ${filterTri === 't1' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
              <span className="block text-xs opacity-80">Trimester 1</span>
              <span className="text-2xl font-bold">{moms.filter(m => m.trimester === 1).length}</span>
          </div>
          <div onClick={() => setFilterTri('t3')} className={`cursor-pointer p-4 rounded-xl border ${filterTri === 't3' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white border-purple-100 hover:border-purple-300'}`}>
              <span className="block text-xs opacity-80">Trimester 3</span>
              <span className="text-2xl font-bold">{moms.filter(m => m.trimester === 3).length}</span>
          </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
            type="text" 
            placeholder="Cari nama ibu hamil..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* LIST GRID */}
      {loading ? (
          <p className="text-center text-gray-400 py-10">Memuat data kehamilan...</p>
      ) : filteredMoms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMoms.map((mom) => (
                  <div key={mom.id} className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${(mom.uk || 0) >= 37 ? 'border-red-200' : 'border-gray-200'}`}>
                      
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Baby size={80} className="text-pink-500"/>
                      </div>

                      <div className="flex justify-between items-start mb-3 relative z-10">
                          <div>
                              <h3 className="font-bold text-gray-800 text-lg">{mom.name}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Heart size={10} className="text-red-400"/> Suami: {mom.husband_name || "-"}
                              </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${(mom.uk || 0) >= 37 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-pink-100 text-pink-600'}`}>
                              {mom.status === 'Siaga' ? 'SIAGA' : `Trimester ${mom.trimester}`}
                          </span>
                      </div>

                      <div className="bg-pink-50/50 rounded-xl p-3 mb-4 border border-pink-100 relative z-10">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">Usia Kehamilan</span>
                              <span className="text-lg font-bold text-pink-700">{mom.uk} Minggu</span>
                          </div>
                          <div className="w-full bg-pink-100 rounded-full h-1.5">
                              <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${Math.min(((mom.uk || 0) / 40) * 100, 100)}%` }}></div>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                              <span className="text-[10px] text-gray-400">HPL (Estimasi)</span>
                              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                  <Calendar size={12}/> {mom.hpl}
                              </span>
                          </div>
                      </div>

                      <div className="flex gap-2 relative z-10">
                          <a 
                            href={`https://wa.me/${mom.phone}`}
                            target="_blank"
                            className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                          >
                              <MessageCircle size={14}/> WhatsApp
                          </a>
                          
                          {/* BUTTON DETAIL (Sekarang Berfungsi) */}
                          <button 
                            onClick={() => handleOpenHistory(mom)}
                            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                          >
                              <FileText size={14}/> Riwayat
                          </button>
                      </div>

                      {(mom.uk || 0) >= 37 && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg">
                              <AlertTriangle size={12}/>
                              <span>Pasien sudah mendekati HPL. Siapkan rujukan jika perlu.</span>
                          </div>
                      )}

                  </div>
              ))}
          </div>
      ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
             <Baby size={48} className="mx-auto mb-4 text-gray-300"/>
             <h3 className="text-gray-800 font-bold">Belum ada data ibu hamil</h3>
             <p className="text-gray-500 text-sm">Pastikan mengisi kolom HPHT saat input data pasien.</p>
          </div>
      )}

      {/* MODAL HISTORY */}
      <AncHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        patientId={selectedMom?.id || null}
        patientName={selectedMom?.name || ""}
      />

    </div>
  );
}