"use client";

import { useState, useEffect } from "react";
import { X, Calculator, Save, Plus, Trash2 } from "lucide-react";
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

// Interface Obat & Cart
interface Medicine {
  id: string;
  name: string;
  price: number;
  stock: number;
}
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
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
  
  // 🔥 CEK ROLE USER
  const [userRole, setUserRole] = useState<string>("staff");

  // Data Obat & Cart
  const [medicineList, setMedicineList] = useState<Medicine[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

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

  // 1. Fetch Data Awal (Role & Obat)
  useEffect(() => {
    const fetchInitData = async () => {
      // Ambil Role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
         if (profile) setUserRole(profile.role);
      }
      // Ambil Obat
      const { data: meds } = await supabase.from("medicines").select("*").order("name", { ascending: true });
      if (meds) setMedicineList(meds);
    };

    if (isOpen) fetchInitData();
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
        setCart([]); // Reset Cart
      }
    }
  }, [isOpen, transactionToEdit, medicineList]);

  // --- LOGIKA KERANJANG OBAT (MULTIPLE) ---
  const handleAddToCart = (medId: string) => {
    const med = medicineList.find(m => m.id === medId);
    if (med) {
       setCart(prev => {
         const exists = prev.find(item => item.id === medId);
         if (exists) {
            return prev.map(item => item.id === medId ? { ...item, qty: item.qty + 1 } : item);
         }
         return [...prev, { id: med.id, name: med.name, price: med.price, qty: 1 }];
       });
    }
  };

  const updateCartItem = (index: number, field: 'qty' | 'price', value: string) => {
     const numValue = parseFloat(value) || 0;
     setCart(prev => {
        const newCart = [...prev];
        if (field === 'qty') newCart[index].qty = numValue > 0 ? numValue : 1;
        if (field === 'price') newCart[index].price = numValue;
        return newCart;
     });
  };

  const removeCartItem = (index: number) => {
     setCart(prev => prev.filter((_, i) => i !== index));
  };

  // 4. Hitung Total Dinamis
  useEffect(() => {
    if (formData.category === "Obat & Vitamin" && !transactionToEdit) {
       // Mode Multiple (Cart)
       const totalCart = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
       setTotalAmount(totalCart);
    } else {
       // Mode Single / Edit
       const priceNum = parseFloat(formData.price.replace(/[^0-9]/g, '')) || 0;
       const qtyNum = formData.qty || 0;
       setTotalAmount(priceNum * qtyNum);
    }
  }, [formData.price, formData.qty, formData.category, transactionToEdit, cart]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccessModal) return null;

  // Cek apakah mode Obat Multiple
  const isMultipleMedicineMode = formData.category === "Obat & Vitamin" && !transactionToEdit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMultipleMedicineMode && cart.length === 0) {
       return alert("Keranjang obat masih kosong!");
    }
    setLoading(true);

    try {
      if (transactionToEdit) {
        // ============================
        // LOGIKA EDIT (UPDATE 1 BARIS)
        // ============================
        if (transactionToEdit.category === "Obat & Vitamin") {
            const { data: oldMed } = await supabase.from("medicines").select("*").eq("name", transactionToEdit.description).single();
            if (oldMed) {
                let revertedStock = oldMed.stock;
                if (transactionToEdit.type === "in") revertedStock = oldMed.stock + transactionToEdit.quantity;
                else revertedStock = oldMed.stock - transactionToEdit.quantity;
                await supabase.from("medicines").update({ stock: revertedStock }).eq("id", oldMed.id);
            }
        }

        const payload = {
          description: formData.category === "Obat & Vitamin" ? (medicineList.find(m => m.id === selectedMedicineId)?.name || formData.description) : formData.description,
          category: formData.category,
          type: formData.type,
          date: formData.date,
          quantity: formData.qty,
          amount: totalAmount, 
        };

        const { error } = await supabase.from("transactions").update(payload).eq("id", transactionToEdit.id);
        if (error) throw error;

        if (formData.category === "Obat & Vitamin" && selectedMedicineId) {
            const { data: currentMed } = await supabase.from("medicines").select("*").eq("id", selectedMedicineId).single();
            if (currentMed) {
                let finalStock = currentMed.stock;
                if (formData.type === "in") finalStock = currentMed.stock - formData.qty;
                else finalStock = currentMed.stock + formData.qty;
                await supabase.from("medicines").update({ stock: finalStock }).eq("id", selectedMedicineId);
            }
        }

      } else {
        // ============================
        // LOGIKA INSERT (BISA MULTIPLE)
        // ============================
        if (isMultipleMedicineMode) {
           // Insert Multiple Transactions
           const payloadData = cart.map(item => ({
              description: item.name,
              category: "Obat & Vitamin",
              type: formData.type,
              date: formData.date,
              quantity: item.qty,
              amount: item.price * item.qty
           }));

           const { error } = await supabase.from("transactions").insert(payloadData);
           if (error) throw error;

           // Update Multiple Stock
           for (const item of cart) {
              const { data: medData } = await supabase.from("medicines").select("stock").eq("id", item.id).single();
              if (medData) {
                 const newStock = formData.type === "in" ? medData.stock - item.qty : medData.stock + item.qty;
                 await supabase.from("medicines").update({ stock: newStock }).eq("id", item.id);
              }
           }
        } else {
           // Insert Single Transaction (Layanan Medis, Alat Kesehatan, dll)
           const payload = {
             description: formData.description,
             category: formData.category,
             type: formData.type,
             date: formData.date,
             quantity: formData.qty,
             amount: totalAmount, 
           };
           const { error } = await supabase.from("transactions").insert([payload]);
           if (error) throw error;
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

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-800">
                {transactionToEdit ? "Edit Transaksi" : "Catat Transaksi Baru"}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                
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
                    <select className="w-full px-4 py-2 border rounded-xl bg-white text-sm font-medium" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                      <option value="Layanan Medis">Layanan Medis</option>
                      <option value="Obat & Vitamin">Obat & Vitamin</option>
                      <option value="Alat Kesehatan">Alat Kesehatan</option>
                      
                      {/* 🔥 FILTER KATEGORI BERDASARKAN ROLE (HANYA OWNER YANG BISA LIHAT) */}
                      {userRole === 'owner' && (
                        <>
                           <option value="Operasional">Operasional</option>
                           <option value="Maintenance">Maintenance</option>
                        </>
                      )}
                      
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                {/* --- RENDER KERANJANG JIKA MODE OBAT MULTIPLE --- */}
                {isMultipleMedicineMode ? (
                   <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4 space-y-3">
                      <label className={`block text-xs font-bold uppercase ${formData.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {formData.type === 'in' ? "Tambah Obat Terjual (Keluar)" : "Tambah Obat Dibeli (Masuk)"}
                      </label>
                      <select 
                          className="w-full px-4 py-2 border bg-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          onChange={(e) => { if(e.target.value) { handleAddToCart(e.target.value); e.target.value=""; } }}
                      >
                          <option value="">+ Pilih Obat untuk Ditambahkan</option>
                          {medicineList.map((med) => (
                              <option key={med.id} value={med.id}>{med.name} (Stok: {med.stock})</option>
                          ))}
                      </select>

                      {/* List Keranjang */}
                      <div className="space-y-2 mt-3 max-h-40 overflow-y-auto pr-1">
                          {cart.map((item, idx) => (
                             <div key={item.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative">
                                <div className="flex justify-between items-center pr-6">
                                   <span className="font-bold text-gray-800 text-sm line-clamp-1">{item.name}</span>
                                   <button type="button" onClick={() => removeCartItem(idx)} className="absolute right-2 top-3 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                   <div>
                                      <span className="text-[10px] text-gray-500 font-bold uppercase">Harga/Item</span>
                                      <input type="number" className="w-full border rounded p-1 text-sm font-mono" value={item.price} onChange={(e) => updateCartItem(idx, 'price', e.target.value)} />
                                   </div>
                                   <div>
                                      <span className="text-[10px] text-gray-500 font-bold uppercase">Qty</span>
                                      <input type="number" min="1" className="w-full border rounded p-1 text-sm font-mono text-center" value={item.qty} onChange={(e) => updateCartItem(idx, 'qty', e.target.value)} />
                                   </div>
                                </div>
                             </div>
                          ))}
                      </div>
                   </div>
                ) : (
                  /* --- RENDER SINGLE INPUT (Non-Obat ATAU Mode Edit) --- */
                  <>
                    {formData.category === "Obat & Vitamin" && transactionToEdit ? (
                      <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Obat (Edit Mode)</label>
                         <select className="w-full px-4 py-2 border bg-gray-50 rounded-xl" value={selectedMedicineId} onChange={(e) => {
                             setSelectedMedicineId(e.target.value);
                             const med = medicineList.find(m => m.id === e.target.value);
                             if (med) setFormData({...formData, description: med.name, price: med.price.toString()});
                         }}>
                             <option value="">-- Pilih Obat --</option>
                             {medicineList.map((med) => (<option key={med.id} value={med.id}>{med.name}</option>))}
                         </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keterangan / Nama Item</label>
                        <input required type="text" placeholder="Contoh: Beli Kertas USG" className="w-full px-4 py-2 border rounded-xl text-sm" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                             {formData.type === 'in' ? "Harga Satuan (Pemasukan)" : "Harga Satuan (Pengeluaran)"}
                          </label>
                          <input required type="number" className="w-full px-4 py-2 border rounded-xl font-mono text-sm" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Qty</label>
                          <input required type="number" min="1" className="w-full px-4 py-2 border rounded-xl font-mono text-center text-sm" value={formData.qty} onChange={(e) => setFormData({...formData, qty: parseInt(e.target.value) || 1})} />
                        </div>
                    </div>
                  </>
                )}

                {/* --- BAGIAN BAWAH (TOTAL & TOMBOL SIMPAN) --- */}
                <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center border border-blue-100 mt-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Calculator size={20} />
                      <span className="text-sm font-bold">Total Transaksi</span>
                    </div>
                    <span className="text-xl font-bold text-blue-700">{formatRupiah(totalAmount)}</span>
                </div>

                <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors mt-2 flex justify-center items-center gap-2 shadow-md ${formData.type === 'in' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>
                  {loading ? "Memproses..." : <><Save size={18} /> Simpan Transaksi</>}
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      <ActionModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        type="success"
        title="Berhasil!"
        message={formData.category === "Obat & Vitamin" 
            ? (formData.type === 'in' ? "Pemasukan tercatat & Stok obat berkurang." : "Pengeluaran (kulakan) tercatat & Stok obat bertambah.") 
            : "Data transaksi berhasil disimpan."}
      />
    </>
  );
}