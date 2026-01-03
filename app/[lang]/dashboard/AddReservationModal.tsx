"use client";

import { useState, useRef } from "react";
import { X, Save, Search, Loader2, Calendar } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";

interface Patient { id: string; name: string; address: string; nik?: string; }

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddReservationModal({ isOpen, onClose }: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // SEARCH PASIEN
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    visit_date: new Date().toISOString().split('T')[0],
    session_time: "Pagi (08:00 - 12:00)",
    service_type: "Pemeriksaan Umum",
    complaint: ""
  });

  // LOGIKA SEARCH
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setPatientQuery(query);
    setShowDropdown(true);

    if (!query) {
        setPatientResults([]);
        return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
        setIsSearching(true);
        const { data } = await supabase.from("patients").select("*").ilike("name", `%${query}%`).limit(5);
        setPatientResults(data || []);
        setIsSearching(false);
    }, 300);
  };

  const selectPatient = (p: Patient) => {
      setFormData({ ...formData, patient_id: p.id, patient_name: p.name });
      setPatientQuery(p.name);
      setShowDropdown(false);
  };

  // SUBMIT RESERVASI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) return alert("Pilih pasien dulu!");

    setLoading(true);
    try {
        const payload = {
            patient_id: formData.patient_id,
            patient_name: formData.patient_name, // Simpan nama biar query gampang
            queue_date: formData.visit_date,     // Simpan tanggal saja (YYYY-MM-DD)
            session: formData.session_time,      // Simpan teks sesi (Pagi/Siang/Malam)
            service_type: formData.service_type, // Jenis Layanan
            complaint: formData.complaint,
            status: "Menunggu"                   // Default status
        };

        const { error } = await supabase.from("queues").insert([payload]);
        if (error) throw error;

        setShowSuccess(true);
    } catch (err: any) {
        alert("Gagal booking: " + err.message);
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
                <Calendar size={20} /> Booking Antrian Manual
              </h3>
              <button onClick={onClose}><X size={20} className="hover:text-red-200" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Cari Pasien */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Cari Pasien</label>
                <div className="relative">
                    <input 
                        type="text" 
                        required
                        placeholder="Ketik nama pasien..." 
                        className="w-full pl-9 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={patientQuery}
                        onChange={handleSearch}
                        onFocus={() => setShowDropdown(true)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16}/>}
                </div>
                {/* Dropdown */}
                {showDropdown && patientQuery && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {patientResults.map(p => (
                            <div key={p.id} onClick={() => selectPatient(p)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0">
                                <p className="text-sm font-bold text-gray-800">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.address}</p>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* Tanggal & Sesi */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label>
                      <input type="date" required className="w-full p-2 border rounded-xl" value={formData.visit_date} onChange={(e) => setFormData({...formData, visit_date: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1">Pilih Sesi</label>
                      <select className="w-full p-2 border rounded-xl bg-white" value={formData.session_time} onChange={(e) => setFormData({...formData, session_time: e.target.value})}>
                          <option value="Pagi">Pagi (08-12)</option>
                          <option value="Siang">Siang (13-17)</option>
                          <option value="Malam">Malam (18-21)</option>
                      </select>
                  </div>
              </div>

              {/* Layanan */}
              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1">Layanan</label>
                  <select className="w-full p-2 border rounded-xl bg-white" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})}>
                      <option value="Pemeriksaan Umum">Pemeriksaan Umum</option>
                      <option value="Pemeriksaan Kehamilan">Pemeriksaan Kehamilan</option>
                      <option value="Imunisasi Anak">Imunisasi Anak</option>
                      <option value="KB (Keluarga Berencana)">KB</option>
                      <option value="Persalinan">Persalinan</option>
                  </select>
              </div>

              {/* Keluhan */}
              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1">Keluhan / Tujuan</label>
                  <input type="text" required placeholder="Contoh: Imunisasi, KB, Periksa Hamil" className="w-full p-2 border rounded-xl" value={formData.complaint} onChange={(e) => setFormData({...formData, complaint: e.target.value})} />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 mt-2">
                  {loading ? "Menyimpan..." : <><Save size={18}/> Booking Antrian</>}
              </button>

            </form>
          </div>
        </div>
      )}
      <ActionModal isOpen={showSuccess} onClose={handleSuccessClose} type="success" title="Berhasil!" message="Pasien berhasil masuk antrian." />
    </>
  );
}