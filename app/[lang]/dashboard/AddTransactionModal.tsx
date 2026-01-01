"use client";

import { useState, useEffect } from "react";
import { X, Calculator, Save } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";

// Definisi Tipe Data Transaksi
interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  type: 'in' | 'out';
}

// Interface Obat
interface Medicine {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export default function AddTransactionModal({ isOpen, onClose, transactionToEdit }: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Data Obat
  const [medicineList, setMedicineList] = useState<Medicine[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");

  // State Form
  const [formData, setFormData] = useState({
    description: "",
    category: "Layanan Medis",
    type: "in" as 'in' | 'out', 
    date: new Date().toISOString().split('T')[0],
    price: "", 
    qty: 1,    
  });

  const [totalAmount, setTotalAmount] = useState(0);

  // 1. Fetch Data Obat
  useEffect(() => {
    const fetchMedicines = async () => {
      const { data } = await supabase.from("medicines").select("*").order("name", { ascending: true });
      if (data) setMedicineList(data);
    };
    if (isOpen) fetchMedicines();
  }, [isOpen, supabase]);

  // 2. Setup Form (Edit/Add)
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        const pricePerItem = transactionToEdit.amount / transactionToEdit.quantity;
        setFormData({
          description: transactionToEdit.description,
          category: transactionToEdit.category,
          type: transactionToEdit.type,
          date: transactionToEdit.date,
          price: pricePerItem.toString(),
          qty: transactionToEdit.quantity
        });
        setTotalAmount(transactionToEdit.amount); 
        if (transactionToEdit.category === "Obat & Vitamin") {
            const matchedMed = medicineList.find(m => m.name === transactionToEdit.description);
            if (matchedMed) {
                setSelectedMedicineId(matchedMed.id);
            }
        }
      } else {
        setFormData({
          description: "",
          category: "Layanan Medis",
          type: "in",
          date: new Date().toISOString().split('T')[0],
          price: "",
          qty: 1
        });
        setTotalAmount(0);
        setSelectedMedicineId("");
      }
    }
  }, [isOpen, transactionToEdit, medicineList]);

  // 3. Logic Pilih Obat
  const handleMedicineSelect = (medId: string) => {
    setSelectedMedicineId(medId);
    const selectedMed = medicineList.find((m) => m.id === medId);
    
    if (selectedMed) {
       // Kalau Pemasukan (Jual), ambil harga jual dari master
       // Kalau Pengeluaran (Beli), biasanya harga beli beda, tapi kita defaultkan ke harga master dulu
       setFormData({
         ...formData,
         description: selectedMed.name,
         price: selectedMed.price.toString() 
       });
    }
  };

  // 4. Hitung Total
  useEffect(() => {
    const priceNum = parseFloat(formData.price.replace(/[^0-9]/g, '')) || 0;
    const qtyNum = formData.qty || 0;
    setTotalAmount(priceNum * qtyNum);
  }, [formData.price, formData.qty]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccessModal) return null;

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        description: formData.description,
        category: formData.category,
        type: formData.type,
        date: formData.date,
        quantity: formData.qty,
        amount: totalAmount, 
      };

      if (transactionToEdit) {
        // --- LOGIKA EDIT (UPDATE) ---
        
        // A. REVERT STOK LAMA (Kembalikan stok seperti semula)
        if (transactionToEdit.category === "Obat & Vitamin") {
            // Cari obat lama berdasarkan nama lama
            const { data: oldMed } = await supabase
                .from("medicines")
                .select("*")
                .eq("name", transactionToEdit.description)
                .single();

            if (oldMed) {
                let revertedStock = oldMed.stock;
                if (transactionToEdit.type === "in") {
                    // Dulu Jual (-) -> Balikin (+)
                    revertedStock = oldMed.stock + transactionToEdit.quantity;
                } else {
                    // Dulu Beli (+) -> Balikin (-)
                    revertedStock = oldMed.stock - transactionToEdit.quantity;
                }
                // Simpan stok sementara ke database agar perhitungan baru nanti akurat
                await supabase.from("medicines").update({ stock: revertedStock }).eq("id", oldMed.id);
            }
        }

        // B. UPDATE TRANSAKSI
        const { error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", transactionToEdit.id);

        if (error) throw error;

        // C. APPLY STOK BARU (Kurangi/Tambah stok berdasarkan inputan baru)
        if (formData.category === "Obat & Vitamin" && selectedMedicineId) { // Pastikan ID Obat terpilih
            const { data: currentMed } = await supabase.from("medicines").select("*").eq("id", selectedMedicineId).single();
            
            if (currentMed) {
                let finalStock = currentMed.stock;
                if (formData.type === "in") {
                    // Jual Baru -> Kurangi
                    finalStock = currentMed.stock - formData.qty;
                } else {
                    // Beli Baru -> Tambah
                    finalStock = currentMed.stock + formData.qty;
                }
                await supabase.from("medicines").update({ stock: finalStock }).eq("id", selectedMedicineId);
            }
        }

      } else {
        // --- LOGIKA INSERT (TAMBAH BARU) ---
        // (Bagian ini TETAP SAMA seperti sebelumnya)
        const { error } = await supabase.from("transactions").insert([payload]);
        if (error) throw error;

        if (formData.category === "Obat & Vitamin" && formData.type === "in" && selectedMedicineId) {
            const med = medicineList.find(m => m.id === selectedMedicineId);
            if (med) {
                const newStock = med.stock - formData.qty;
                await supabase.from("medicines").update({ stock: newStock }).eq("id", selectedMedicineId);
            }
        }
        // Tambahan: Logika untuk Pengeluaran (Beli Stok) saat Insert Baru
        if (formData.category === "Obat & Vitamin" && formData.type === "out" && selectedMedicineId) {
             const med = medicineList.find(m => m.id === selectedMedicineId);
             if (med) {
                 const newStock = med.stock + formData.qty;
                 await supabase.from("medicines").update({ stock: newStock }).eq("id", selectedMedicineId);
             }
        }
      }

      setShowSuccessModal(true);

    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  };

  // Cek apakah kategori obat dipilih (Berlaku untuk IN maupun OUT)
  const isMedicineMode = formData.category === "Obat & Vitamin";

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">
                {transactionToEdit ? "Edit Transaksi" : "Catat Transaksi Baru"}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Tipe Transaksi */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "in" })}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    formData.type === "in" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  + Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "out" })}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    formData.type === "out" ? "bg-white text-red-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  - Pengeluaran 
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                  <input required type="date" className="w-full px-4 py-2 border rounded-xl text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                  <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="Layanan Medis">Layanan Medis</option>
                    <option value="Obat & Vitamin">Obat & Vitamin</option>
                    <option value="Alat Kesehatan">Alat Kesehatan</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* LOGIKA DROPDOWN OBAT */}
              {isMedicineMode && !transactionToEdit ? (
                 <div>
                    <label className={`block text-xs font-bold uppercase mb-1 ${formData.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.type === 'in' ? "Pilih Obat Terjual (Stok Berkurang)" : "Pilih Obat Dibeli (Stok Bertambah)"}
                    </label>
                    <select 
                        className="w-full px-4 py-2 border bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        value={selectedMedicineId}
                        onChange={(e) => handleMedicineSelect(e.target.value)}
                    >
                        <option value="">-- Pilih Obat --</option>
                        {medicineList.map((med) => (
                            <option key={med.id} value={med.id}>
                                {med.name} (Stok Saat Ini: {med.stock})
                            </option>
                        ))}
                    </select>
                 </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keterangan</label>
                  <input required type="text" placeholder="Keterangan transaksi..." className="w-full px-4 py-2 border rounded-xl" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                       {formData.type === 'in' ? "Harga Jual (Rp)" : "Harga Beli (Rp)"}
                    </label>
                    <input required type="number" className="w-full px-4 py-2 border rounded-xl font-mono" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Qty</label>
                    <input required type="number" min="1" className="w-full px-4 py-2 border rounded-xl font-mono text-center" value={formData.qty} onChange={(e) => setFormData({...formData, qty: parseInt(e.target.value) || 1})} />
                  </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Calculator size={20} />
                    <span className="text-sm font-bold">Total</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">{formatRupiah(totalAmount)}</span>
              </div>

              <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3 rounded-xl transition-colors mt-2 flex justify-center items-center gap-2 ${formData.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {loading ? "Menyimpan..." : <><Save size={18} /> Simpan</>}
              </button>
            </form>

          </div>
        </div>
      )}

      <ActionModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        type="success"
        title="Berhasil!"
        message={formData.category === "Obat & Vitamin" 
            ? (formData.type === 'in' ? "Transaksi tercatat & Stok obat berkurang." : "Transaksi tercatat & Stok obat bertambah.") 
            : "Data transaksi berhasil disimpan."}
      />
    </>
  );
}