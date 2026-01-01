"use client";

import { useState, useEffect } from "react";
import { X, Save, Pill, AlertCircle, PackageCheck, Package } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";

interface Medicine {
  id?: string;
  name: string;
  stock: number;         // Stok Tersedia (Berjalan)
  initial_stock: number; // Stok Awal (Patokan)
  min_stock: number;     // Batas Minimum (Alert)
  price: number;
  unit: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineToEdit?: Medicine | null;
}

export default function AddMedicineModal({ isOpen, onClose, medicineToEdit }: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    initial_stock: "", // Input Stok Awal
    stock: "",         // Input Stok Tersedia (Biasanya auto, tapi bisa diedit)
    min_stock: "5",    // Default batas aman 5
    price: "",
    unit: "Pcs",
  });

  // Reset / Isi Form saat Modal Dibuka
  useEffect(() => {
    if (isOpen) {
      if (medicineToEdit) {
        setFormData({
          name: medicineToEdit.name,
          initial_stock: medicineToEdit.initial_stock?.toString() || medicineToEdit.stock.toString(),
          stock: medicineToEdit.stock.toString(),
          min_stock: medicineToEdit.min_stock?.toString() || "5",
          price: medicineToEdit.price.toString(),
          unit: medicineToEdit.unit,
        });
      } else {
        setFormData({
          name: "",
          initial_stock: "",
          stock: "",
          min_stock: "5",
          price: "",
          unit: "Pcs",
        });
      }
    }
  }, [isOpen, medicineToEdit]);

  // Handler saat Stok Awal diisi (Khusus Mode Tambah Baru)
  // Biar user ga perlu ngetik 2x, stok tersedia otomatis ngikut stok awal
  const handleInitialStockChange = (val: string) => {
      if (!medicineToEdit) {
          setFormData(prev => ({ ...prev, initial_stock: val, stock: val }));
      } else {
          setFormData(prev => ({ ...prev, initial_stock: val }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        initial_stock: parseInt(formData.initial_stock) || 0,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 5,
        price: parseInt(formData.price) || 0,
        unit: formData.unit,
      };

      if (medicineToEdit) {
        const { error } = await supabase.from("medicines").update(payload).eq("id", medicineToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medicines").insert([payload]);
        if (error) throw error;
      }

      setShowSuccess(true);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white rounded-t-2xl">
              <h3 className="font-bold flex items-center gap-2">
                <Pill size={20} /> {medicineToEdit ? "Edit Data Obat" : "Tambah Obat Baru"}
              </h3>
              <button onClick={onClose}><X size={20} className="hover:text-red-200" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Nama Obat</label>
                <input required type="text" className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Paracetamol 500mg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <Package size={12}/> Stok Awal
                    </label>
                    <input 
                        required 
                        type="number" 
                        className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={formData.initial_stock} 
                        onChange={(e) => handleInitialStockChange(e.target.value)} 
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <PackageCheck size={12}/> Stok Tersedia
                    </label>
                    <input 
                        required 
                        type="number" 
                        className="w-full p-2 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={formData.stock} 
                        onChange={(e) => setFormData({...formData, stock: e.target.value})} 
                        placeholder="0"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1 text-red-500">
                        <AlertCircle size={12}/> Batas Minimum
                    </label>
                    <input 
                        required 
                        type="number" 
                        className="w-full p-2 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" 
                        value={formData.min_stock} 
                        onChange={(e) => setFormData({...formData, min_stock: e.target.value})} 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Satuan</label>
                    <select className="w-full p-2 border rounded-xl bg-white" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                        <option value="Pcs">Pcs</option>
                        <option value="Strip">Strip</option>
                        <option value="Botol">Botol</option>
                        <option value="Box">Box</option>
                        <option value="Tablet">Tablet</option>
                    </select>
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Harga Jual (Per {formData.unit})</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 font-bold">Rp</span>
                    <input required type="number" className="w-full pl-10 p-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 mt-4">
                {loading ? "Menyimpan..." : <><Save size={18} /> Simpan Data Obat</>}
              </button>

            </form>
          </div>
        </div>
      )}
      <ActionModal isOpen={showSuccess} onClose={handleSuccessClose} type="success" title="Berhasil!" message="Data obat berhasil disimpan ke database." />
    </>
  );
}