"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Pill, Plus, Search, Pencil, Trash2, Package, AlertTriangle, TrendingDown } from "lucide-react";
import AddMedicineModal from "../AddMedicineModal";
import ActionModal from "../ActionModal";

interface Medicine {
  id: string;
  name: string;
  stock: number;         // Stok saat ini
  initial_stock: number; // Stok awal (baru ditambah)
  min_stock: number;     // Batas aman
  price: number;
  unit: string;
}

export default function ObatPage() {
  const supabase = createClient();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"success" | "delete">("delete");
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  const fetchMedicines = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("medicines").select("*").order("name", { ascending: true });
    if (data) setMedicines(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchMedicines(); }, []);

  const filteredMedicines = medicines.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalType("delete");
    setIsActionModalOpen(true);
  };

  const executeDelete = async () => {
    if (deleteTarget) {
      await supabase.from("medicines").delete().eq("id", deleteTarget.id);
      setModalType("success");
      fetchMedicines();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stok Obat & Vitamin</h1>
          <p className="text-gray-500 text-sm">Monitor perbandingan stok awal vs tersedia.</p>
        </div>
        <button onClick={() => { setEditingMedicine(null); setIsModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 shadow-lg shadow-blue-200">
           <Plus size={18} /> Tambah Obat
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Cari nama obat..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <p>Memuat data...</p> : filteredMedicines.map((med) => {
          
          // Logic Warna & Progress Bar
          const minStock = med.min_stock || 5;
          const isLowStock = med.stock <= minStock;
          const initial = med.initial_stock || med.stock; // Fallback kalau initial 0
          
          // Hitung persentase sisa stok (max 100%)
          const percentage = initial > 0 ? Math.min((med.stock / initial) * 100, 100) : 0;
          
          return (
            <div key={med.id} className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all group relative ${isLowStock ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'}`}>
               
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isLowStock ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                        {isLowStock ? <AlertTriangle size={24} /> : <Pill size={24} />}
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-800">{med.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">Rp {med.price.toLocaleString("id-ID")}/{med.unit}</p>
                     </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => { setEditingMedicine(med); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Pencil size={16} /></button>
                     <button onClick={() => handleDeleteClick(med.id, med.name)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
               </div>

               {/* PROGRESS BAR STOK */}
               <div className="mt-2 mb-4">
                   <div className="flex justify-between text-xs mb-1 font-semibold">
                       <span className={isLowStock ? "text-red-600" : "text-gray-500"}>
                           {isLowStock ? "Stok Menipis!" : "Ketersediaan"}
                       </span>
                       <span className="text-gray-700">{med.stock} / {initial} {med.unit}</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                       <div 
                           className={`h-2.5 rounded-full transition-all duration-500 ${isLowStock ? 'bg-red-500' : 'bg-blue-500'}`} 
                           style={{ width: `${percentage}%` }}
                       ></div>
                   </div>
               </div>

               <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Min. Stok</span>
                     <span className="text-xs font-semibold text-gray-600">{minStock} {med.unit}</span>
                  </div>
                  
                  <div className="text-right">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                     {isLowStock ? (
                         <span className="px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1">
                             <TrendingDown size={12}/> Restok
                         </span>
                     ) : (
                         <span className="px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-bold flex items-center gap-1">
                             <Package size={12}/> Aman
                         </span>
                     )}
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      <AddMedicineModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchMedicines(); }} medicineToEdit={editingMedicine} />
      
      <ActionModal 
        isOpen={isActionModalOpen} 
        onClose={() => { setIsActionModalOpen(false); setDeleteTarget(null); }} 
        onConfirm={executeDelete} 
        type={modalType} 
        title={modalType === "delete" ? "Hapus Obat?" : "Berhasil"} 
        message={modalType === "delete" ? `Hapus data "${deleteTarget?.name}"?` : "Data obat berhasil dihapus."} 
      />
    </div>
  );
}