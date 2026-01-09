"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Search, Plus, User, FileText, Activity, Eye, Pencil, Trash2 } from "lucide-react";
import AddMedicalRecordModal from "../AddMedicalRecordModal";
import MedicalRecordDetailModal from "../MedicalRecordDetailModal"; // Import Detail Modal
import ActionModal from "../ActionModal"; // Import Delete Modal

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
  // Fields for detail/edit
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

  const fetchRecords = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("medical_records")
      .select("*")
      .order("visit_date", { ascending: false });
    
    if (data) setRecords(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleDelete = async () => {
    if (deleteId) {
       await supabase.from("medical_records").delete().eq("id", deleteId);
       setIsDeleteOpen(false);
       fetchRecords();
    }
  };

  const filteredRecords = records.filter(r => 
    r.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Pelayanan & Rekam Medis</h1>
           <p className="text-gray-500 text-sm">Input pemeriksaan pasien dan resep obat.</p>
        </div>
        <button 
          onClick={() => { setSelectedRecord(null); setIsFormOpen(true); }}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
           <Plus size={20} /> Input Pasien Baru
        </button>
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

      {/* List Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {isLoading ? <p>Memuat data...</p> : filteredRecords.map((rec) => (
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
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 shrink-0">
                     {new Date(rec.visit_date).toLocaleDateString("id-ID")}
                  </span>
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
                  
                  {/* ACTION BUTTONS (Icons) */}
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