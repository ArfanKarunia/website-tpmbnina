"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, 
  UserPlus, 
  MapPin, 
  Phone,
  RefreshCcw,
  Pencil, 
  Trash2, 
  AlertCircle,
  CreditCard 
} from "lucide-react";
import AddPatientModal from "../AddPatientModal"; 
import ActionModal from "../ActionModal"; 

interface Patient {
  id: string;
  created_at: string;
  nik: string;        
  name: string;
  birth_date: string; 
  address: string;
  phone: string;
  type: string;
  last_visit: string;
  gender: string;
  husband_name?: string;
}

export default function PasienPage() {
  const supabase = createClient();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE MODAL FORM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // STATE MODAL ACTION
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"success" | "delete" | "confirm">("delete");
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Helper: Hitung Umur
  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchPatients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching patients:", error);
    else setPatients(data || []);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // LOGIKA DELETE
  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalType("delete");
    setIsActionModalOpen(true);
  };

  const executeDelete = async () => {
    if (modalType === "delete" && deleteTarget) {
      const { error } = await supabase.from("patients").delete().eq("id", deleteTarget.id);
      if (error) {
        alert("Gagal menghapus: " + error.message);
        setIsActionModalOpen(false);
      } else {
        setModalType("success");
        fetchPatients(); 
      }
    }
  };

  const handleCloseActionModal = () => {
    setIsActionModalOpen(false);
    setDeleteTarget(null);
  };

  // LOGIKA FORM
  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  // Filter Logic
  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      patient.name.toLowerCase().includes(searchLower) ||
      (patient.nik && patient.nik.includes(searchTerm)) || 
      (patient.address && patient.address.toLowerCase().includes(searchLower));
    const matchType = filterType === "all" || patient.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Pasien</h1>
          <p className="text-gray-500 text-sm">Kelola data pasien berdasarkan NIK.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPatients} className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" title="Refresh Data">
            <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-lg shadow-blue-200">
            <UserPlus size={18} /> Tambah Pasien Baru
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Cari nama, NIK, atau alamat..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-full md:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Semua Tipe</option>
          <option value="Umum">Umum</option>
          <option value="BPJS">BPJS</option>
        </select>
      </div>

      {/* LIST PASIEN */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (<div key={i} className="bg-gray-100 h-40 rounded-2xl animate-pulse"></div>))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  
                  {/* AVATAR NETRAL (Abu-abu) */}
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-lg shrink-0">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="overflow-hidden">
                    {/* BARIS NAMA & BADGE */}
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 capitalize truncate max-w-[140px]" title={patient.name}>
                            {patient.name}
                        </h3>
                        {/* BADGE GENDER (L/P) */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${patient.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
                            {patient.gender === 'Laki-laki' ? 'L' : 'P'}
                        </span>
                    </div>

                    {/* BARIS NIK & UMUR (Tidak berubah) */}
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                      <CreditCard size={10} /> {patient.nik || "-"} 
                      <span className="mx-1">•</span> 
                      {calculateAge(patient.birth_date)} Th
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                   <button onClick={() => handleEdit(patient)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={18} /></button>
                   <button onClick={() => handleDeleteClick(patient.id, patient.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={16} className="shrink-0 text-gray-400" />
                  <span className="truncate">{patient.address || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={16} className="shrink-0 text-gray-400" />
                  <span>{patient.phone || "-"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${patient.type === 'BPJS' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {patient.type}
                </span>
                <p className="text-xs text-gray-400">
                  Terdaftar: <span className="text-gray-600 font-medium">
                    {new Date(patient.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </p>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><AlertCircle size={32} /></div>
           <h3 className="text-gray-800 font-bold text-lg">Data tidak ditemukan</h3>
           <p className="text-gray-500 text-sm mb-6">Coba cari dengan NIK atau Nama lain.</p>
        </div>
      )}

      <AddPatientModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchPatients(); }} patientToEdit={editingPatient} />

      <ActionModal
        isOpen={isActionModalOpen}
        onClose={handleCloseActionModal}
        onConfirm={executeDelete}
        type={modalType}
        title={modalType === "delete" ? "Hapus Pasien?" : "Berhasil!"}
        message={modalType === "delete" ? `Apakah Anda yakin ingin menghapus data pasien "${deleteTarget?.name}"?` : "Data pasien berhasil dihapus dari database."}
        confirmText={modalType === "delete" ? "Hapus Sekarang" : "Tutup"}
      />

    </div>
  );
}