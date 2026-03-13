"use client";

import { useState, useEffect } from "react";
import { X, Save, User, Calendar, CreditCard, Phone, MapPin, Users } from "lucide-react"; 
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal"; 

interface Patient {
  id: string;
  nik: string;
  name: string;
  birth_date: string;
  gender: string; 
  phone: string;
  address: string;
  type: string;
  husband_name?: string; 
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
}

export default function AddPatientModal({ isOpen, onClose, patientToEdit }: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    nik: "",         
    name: "",
    birth_date: "",  
    gender: "Perempuan", 
    phone: "",
    address: "",
    type: "Umum",
    husband_name: "" 
  });

  useEffect(() => {
    if (isOpen) {
      if (patientToEdit) {
        setFormData({
          nik: patientToEdit.nik || "",
          name: patientToEdit.name,
          birth_date: patientToEdit.birth_date || "",
          gender: patientToEdit.gender || "Perempuan", 
          phone: patientToEdit.phone || "",
          address: patientToEdit.address || "",
          type: patientToEdit.type || "Umum",
          husband_name: patientToEdit.husband_name || ""
        });
      } else {
        setFormData({
          nik: "",
          name: "",
          birth_date: "",
          gender: "Perempuan",
          phone: "",
          address: "",
          type: "Umum",
          husband_name: ""
        });
      }
    }
  }, [isOpen, patientToEdit]);

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccessModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi panjang NIK
    if (formData.nik.length !== 16) {
      alert("NIK harus terdiri dari 16 digit angka.");
      return;
    }

    setLoading(true);

    try {
      if (patientToEdit) {
        // --- MODE EDIT (UPDATE) ---
        
        // PENGAMAN BARU: Jika NIK diubah, cek apakah NIK baru ini sudah dipakai pasien lain
        if (formData.nik !== patientToEdit.nik) {
            const { data: existing } = await supabase.from('patients').select('id').eq('nik', formData.nik).single();
            if (existing && existing.id !== patientToEdit.id) {
                throw new Error("NIK ini sudah terdaftar atas nama pasien lain!");
            }
        }

        // Sekarang NIK dimasukkan kembali ke payload agar bisa di-update
        const updatePayload = {
          nik: formData.nik, 
          name: formData.name,
          birth_date: formData.birth_date,
          gender: formData.gender, 
          phone: formData.phone,
          address: formData.address,
          type: formData.type,
          husband_name: formData.husband_name
        };

        const { error } = await supabase
          .from("patients")
          .update(updatePayload)
          .eq("id", patientToEdit.id);
          
        if (error) throw error;
        
      } else {
        // --- MODE TAMBAH (INSERT) ---
        const insertPayload = {
          nik: formData.nik,
          name: formData.name,
          birth_date: formData.birth_date,
          gender: formData.gender, 
          phone: formData.phone,
          address: formData.address,
          type: formData.type,
          husband_name: formData.husband_name,
          created_at: new Date().toISOString()
        };

        // Cek NIK Double sebelum insert
        const { data: existing } = await supabase.from('patients').select('id').eq('nik', formData.nik).single();
        if (existing) throw new Error("NIK Pasien sudah terdaftar!");

        const { error } = await supabase.from("patients").insert([insertPayload]);
        if (error) throw error;
      }

      setShowSuccessModal(true);

    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white">
              <h3 className="font-bold flex items-center gap-2">
                <User size={20} />
                {patientToEdit ? "Edit Data Pasien" : "Registrasi Pasien Baru"}
              </h3>
              <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* NIK (SUDAH BISA DIEDIT KEMBALI) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <CreditCard size={12}/> NIK (KTP/KK)
                </label>
                <input 
                  required
                  type="text" 
                  maxLength={16}
                  placeholder="16 Digit NIK..."
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wide transition-colors"
                  value={formData.nik}
                  onChange={(e) => setFormData({...formData, nik: e.target.value.replace(/\D/g, '')})}
                />
              </div>

              {/* NAMA */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              {/* TGL LAHIR & GENDER */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar size={12}/> Tgl Lahir
                  </label>
                  <input required type="date" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Kelamin</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="Perempuan">Perempuan</option>
                    <option value="Laki-laki">Laki-laki</option>
                  </select>
                </div>
              </div>

              {/* TIPE & NO HP */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Pasien</label>
                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                        <option value="Umum">Umum</option>
                        <option value="BPJS">BPJS</option>
                        <option value="Asuransi Lain">Asuransi Lain</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Phone size={12}/> WhatsApp</label>
                    <input required type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
              </div>

              {/* SUAMI (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> Nama Suami / Wali</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.husband_name} onChange={(e) => setFormData({...formData, husband_name: e.target.value})} />
              </div>

              {/* ALAMAT */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Alamat</label>
                <textarea required rows={2} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-200 mt-2">
                {loading ? "Menyimpan..." : <><Save size={18} /> Simpan Data Pasien</>}
              </button>

            </form>
          </div>
        </div>
      )}

      <ActionModal 
        isOpen={showSuccessModal} 
        onClose={handleSuccessClose} 
        type="success"
        title={patientToEdit ? "Data Diperbarui!" : "Pasien Terdaftar!"}
        message={patientToEdit ? "Data pasien telah berhasil diperbarui." : "Pasien baru berhasil disimpan."}
      />
    </>
  );
}