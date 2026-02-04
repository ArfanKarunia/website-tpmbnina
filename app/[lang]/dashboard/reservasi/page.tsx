"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Search, Plus, User, FileText, Activity, Eye, Pencil, Trash2, CalendarDays } from "lucide-react";
import AddMedicalRecordModal from "../AddMedicalRecordModal";
import MedicalRecordDetailModal from "../MedicalRecordDetailModal"; 
import ActionModal from "../ActionModal"; 
import ExportExcelButton from "../ExportExcelButton";

interface MedicalRecord {
  id: string;
  visit_date: string;
  patient_id: string;
  patient_name: string;
  patient_address: string;
  patient_age: string;
  diagnosis: string;
  action: string;
  therapy: string;
  total_price: number;
  weight: number;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  oxygen_saturation: number;
  staff_name: string;
  medicine_cost: number;
  service_fee: number;
  risk_level: string;
}

export default function PelayananPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  
  // Delete States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecords = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("medical_records")
      .select("*")
      .order("visit_date", { ascending: false }); 
    
    if (data) setRecords(data as unknown as MedicalRecord[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

// --- LOGIKA HAPUS YANG SUDAH DIPERBAIKI (SYNC STOK OBAT) ---
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
       // 1. AMBIL DATA OBAT YANG DIPAKAI DI REKAM MEDIS INI (Sebelum dihapus)
       const { data: usedItems } = await supabase
         .from('visit_items')
         .select('*')
         .eq('visit_id', deleteId);

       // 2. KEMBALIKAN STOK OBAT (RESTORE STOCK)
       if (usedItems && usedItems.length > 0) {
          for (const item of usedItems) {
             const { data: masterMed } = await supabase
               .from('medicines')
               .select('stock')
               .eq('id', item.item_id)
               .single();
             
             if (masterMed) {
                await supabase
                  .from('medicines')
                  .update({ stock: masterMed.stock + item.qty })
                  .eq('id', item.item_id);
             }
          }
       }

       const { error } = await supabase.from("medical_records").delete().eq("id", deleteId);
       
       if (error) throw error;
       setIsDeleteOpen(false);
       fetchRecords();
       
    } catch (error: any) {
       alert("Gagal menghapus: " + error.message);
    } finally {
       setIsDeleting(false);
    }
  };

  // 1. FILTER DATA
  const filteredRecords = records.filter(r => 
    r.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. GROUPING DATA PER HARI (LOGIKA BARU)
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: MedicalRecord[] } = {};
    
    filteredRecords.forEach((record) => {
      const dateKey = record.visit_date; // Format YYYY-MM-DD
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });

    // Urutkan tanggal dari yang terbaru ke terlama
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedKeys.map(date => ({
      date,
      items: groups[date]
    }));
  }, [filteredRecords]);


  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Pelayanan & Rekam Medis</h1>
           <p className="text-gray-500 text-sm">Rekapitulasi pemeriksaan pasien harian.</p>
        </div>
        <div className="flex gap-3">

        <ExportExcelButton records={filteredRecords.length > 0 ? filteredRecords : records} />
        <button 
          onClick={() => { setSelectedRecord(null); setIsFormOpen(true); }}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
           <Plus size={20} /> Input Pasien Baru
        </button>
      </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative">
         <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
         <input 
           type="text" 
           placeholder="Cari nama pasien atau diagnosa..." 
           className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* CONTENT GROUP PER HARI */}
      <div className="space-y-10">
         {isLoading ? (
            <div className="text-center py-10 text-gray-500">Memuat data rekam medis...</div>
         ) : groupedRecords.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
              Tidak ada data ditemukan.
            </div>
         ) : (
            groupedRecords.map((group) => (
              <div key={group.date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
               {/* HEADER TANGGAL */}
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-gray-50/95 backdrop-blur-md py-4 px-5 z-10 border-b border-gray-200 rounded-2xl shadow-sm">
                  <div className="bg-white text-blue-600 p-3 rounded-xl shadow-sm border border-blue-100">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 capitalize leading-tight">
                      {new Date(group.date).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">Total Pasien: {group.items.length} Orang</p>
                  </div>
                </div>

                {/* GRID CARD PASIEN */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {group.items.map((rec) => (
                      <div key={rec.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
                         
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                  <User size={20} />
                               </div>
                               <div>
                                  <h4 className="font-bold text-gray-800 line-clamp-1">{rec.patient_name}</h4>
                                  <p className="text-xs text-gray-500 line-clamp-1">{rec.patient_address}</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="space-y-2 mb-4 h-24 overflow-hidden">
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                               <Activity size={16} className="shrink-0 mt-0.5 text-red-400"/>
                               <span className="font-medium text-red-500 line-clamp-1">{rec.diagnosis || "-"}</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg h-full">
                               <FileText size={14} className="shrink-0 mt-0.5"/>
                               <span className="line-clamp-3">{rec.therapy || "Tidak ada obat"}</span>
                            </div>
                         </div>

                         <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-green-600 text-lg">
                               Rp {rec.total_price.toLocaleString("id-ID")}
                            </span>
                            
                            {/* ACTION BUTTONS */}
                            <div className="flex gap-1">
                               <button 
                                  onClick={() => { setSelectedRecord(rec); setIsDetailOpen(true); }}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                  title="Lihat Detail"
                               >
                                  <Eye size={18} />
                               </button>
                               <button 
                                  onClick={() => { setSelectedRecord(rec); setIsFormOpen(true); }}
                                  className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" 
                                  title="Edit Data"
                               >
                                  <Pencil size={18} />
                               </button>
                               <button 
                                  onClick={() => { setDeleteId(rec.id); setIsDeleteOpen(true); }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                  title="Hapus Data"
                               >
                                  <Trash2 size={18} />
                               </button>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                
              </div>
            ))
         )}
      </div>

      {/* MODALS */}
      <AddMedicalRecordModal 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); fetchRecords(); }} 
        recordToEdit={selectedRecord}
      />

      <MedicalRecordDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={selectedRecord}
      />

      <ActionModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        type="delete"
        title="Hapus Rekam Medis?"
        message="Data yang dihapus tidak bisa dikembalikan."
      />

    </div>
  );
}