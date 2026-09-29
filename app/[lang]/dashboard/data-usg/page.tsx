"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, Plus, Calendar, Clock, CheckCircle2, XCircle, 
  Users, Phone, Activity, AlertTriangle, CalendarDays, BarChart3, Pencil, Stethoscope, CalendarOff
} from "lucide-react";

interface USGPasien {
  id: string;
  patient_name: string;
  umur: number;
  nama_suami: string;
  alamat: string;
  phone: string;
  kehamilan_ke: number;
  hpht: string;
  jenis_usg: string;
  harga: number;
  tanggal_reservasi: string;
  jam_reservasi: string;
  status: "menunggu" | "selesai" | "batal";
  no_antrian: number; 
  created_at: string;
}

export default function DataUSGPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<USGPasien[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"harian" | "rekap">("harian");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]); 

  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [isLiburModalOpen, setIsLiburModalOpen] = useState(false);
  const [liburReason, setLiburReason] = useState("Dokter berhalangan hadir");
  const [liburStartDate, setLiburStartDate] = useState(selectedDate);
  const [liburEndDate, setLiburEndDate] = useState(selectedDate);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  
  const [newPatient, setNewPatient] = useState({
    patient_name: "", umur: "", nama_suami: "", alamat: "", phone: "",
    tanggal_reservasi: selectedDate, jam_reservasi: "", kehamilan_ke: "", hpht: "", jenis_usg: "", harga: 0
  });

  const [tarifUsg, setTarifUsg] = useState<{nama: string, harga: number}[]>([]);
  const [isTarifLoading, setIsTarifLoading] = useState(true);

  const getJamOperasional = (dateString: string) => {
    if (!dateString) return "";
    const day = new Date(dateString).getDay();
    if (day === 2) return "15.00 - 17.00 WIB";
    if (day === 5) return "13.00 - 15.00 WIB";
    if (day === 6) return "14.00 - 16.00 WIB";
    if (day === 0) return "14.00 - 16.00 WIB";
    return "";
  };

  const isHariBuka = (dateString: string) => {
    if (closedDays.includes(dateString)) return false;
    return getJamOperasional(dateString) !== "";
  };
  const hariIniBuka = isHariBuka(selectedDate);

  const isWaktuHabis = (dateString: string) => {
    if (!dateString) return false;
    const now = new Date();
    const todayISO = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    if (dateString !== todayISO) return false;

    const currentHour = parseInt(now.toLocaleTimeString('en-GB', { hour: '2-digit', timeZone: 'Asia/Jakarta' }));
    const currentMinute = parseInt(now.toLocaleTimeString('en-GB', { minute: '2-digit', timeZone: 'Asia/Jakarta' }));
    const currentTime = currentHour + (currentMinute / 100); 

    const day = new Date(dateString).getDay();
    let closingTime = 24; 
    if (day === 2) closingTime = 17.00; 
    if (day === 5) closingTime = 15.00; 
    if (day === 6) closingTime = 16.00; 
    if (day === 0) closingTime = 17.00; 

    return currentTime >= closingTime;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setNewPatient({ ...newPatient, tanggal_reservasi: date, jam_reservasi: getJamOperasional(date) });
  };

  const fetchClosedDays = async () => {
    const { data } = await supabase.from("usg_closed_days").select("date");
    if (data) setClosedDays(data.map(d => d.date));
  };

  const fetchTarif = async () => {
    setIsTarifLoading(true);
    const { data } = await supabase
      .from("usg_prices")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });
    if (data) {
      setTarifUsg(data.map(p => ({ nama: p.package_name, harga: p.price })));
    }
    setIsTarifLoading(false);
  };

  const fetchPatients = async () => {
    setLoading(true);
    let query = supabase.from("usg_reservations").select("*");

    if (activeTab === "harian") {
      query = query.eq("tanggal_reservasi", selectedDate);
    } else {
      const year = parseInt(selectedDate.split("-")[0]);
      const month = parseInt(selectedDate.split("-")[1]);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate(); 
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      query = query.gte("tanggal_reservasi", startDate).lte("tanggal_reservasi", endDate);
    }

    const { data, error } = await query.order("no_antrian", { ascending: true });
    if (!error && data) setPatients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClosedDays();
    fetchPatients();
    fetchTarif();
    setNewPatient(prev => ({ ...prev, tanggal_reservasi: selectedDate, jam_reservasi: getJamOperasional(selectedDate) }));
  }, [selectedDate, activeTab]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("usg_reservations").update({ status: newStatus }).eq("id", id);
    if (!error) fetchPatients(); 
  };

  const handleEditClick = (patient: USGPasien) => {
    setEditingId(patient.id);
    setNewPatient({
      patient_name: patient.patient_name,
      umur: patient.umur?.toString() || "",
      nama_suami: patient.nama_suami || "",
      alamat: patient.alamat || "",
      phone: patient.phone || "",
      tanggal_reservasi: patient.tanggal_reservasi,
      jam_reservasi: patient.jam_reservasi,
      kehamilan_ke: patient.kehamilan_ke?.toString() || "",
      hpht: patient.hpht || "",
      jenis_usg: patient.jenis_usg,
      harga: patient.harga
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewPatient({ 
      patient_name: "", umur: "", nama_suami: "", alamat: "", phone: "",
      tanggal_reservasi: selectedDate, jam_reservasi: getJamOperasional(selectedDate), kehamilan_ke: "", hpht: "", jenis_usg: "", harga: 0 
    });
  };

  const handleToggleLiburClick = async () => {
    if (closedDays.includes(selectedDate)) {
      await supabase.from("usg_closed_days").delete().eq("date", selectedDate);
      fetchClosedDays();
    } else {
      setLiburStartDate(selectedDate);
      setLiburEndDate(selectedDate);
      setLiburReason("Dokter berhalangan hadir");
      setIsLiburModalOpen(true);
    }
  };

  const getDatesInRange = (start: string, end: string) => {
    const dateArray = [];
    let currentDate = new Date(start);
    const stopDate = new Date(end);
    while (currentDate <= stopDate) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
  };

  const submitLiburReason = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(liburEndDate) < new Date(liburStartDate)) {
      alert("Tanggal Selesai tidak boleh lebih awal dari Tanggal Mulai.");
      return;
    }

    const datesToClose = getDatesInRange(liburStartDate, liburEndDate);
    
    const payload = datesToClose.map(date => ({
      date: date,
      reason: liburReason
    }));

    const { error } = await supabase.from("usg_closed_days").upsert(payload, { onConflict: 'date' });
    
    if (error) {
      alert("Gagal menyimpan data libur: " + error.message);
    } else {
      setIsLiburModalOpen(false);
      fetchClosedDays();
    }
  };

  const handleSubmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isHariBuka(newPatient.tanggal_reservasi)) {
        alert("Gagal! Hari yang dipilih tidak melayani USG."); return;
    }

    if (!editingId && isWaktuHabis(newPatient.tanggal_reservasi)) {
        alert("Pendaftaran ditolak! Jam operasional USG untuk hari ini sudah berakhir. Silakan pilih hari lain."); return;
    }

    if (editingId) {
      const originalPatient = patients.find(p => p.id === editingId);
      let antrianToSave = originalPatient?.no_antrian;

      if (originalPatient?.tanggal_reservasi !== newPatient.tanggal_reservasi) {
        const { data: antrianData } = await supabase
          .from("usg_reservations")
          .select("no_antrian")
          .eq("tanggal_reservasi", newPatient.tanggal_reservasi)
          .neq("status", "batal");

        if (antrianData && antrianData.length >= 25) {
            alert("Penuh! Kuota 25 pasien untuk tanggal tersebut sudah habis."); return;
        }

        let nextAntrian = 1;
        if (antrianData && antrianData.length > 0) {
            const maxAntrian = Math.max(0, ...antrianData.map(p => Number(p.no_antrian) || 0));
            nextAntrian = maxAntrian + 1;
        }
        antrianToSave = nextAntrian;
      }

      const { error } = await supabase.from("usg_reservations").update({
        patient_name: newPatient.patient_name,
        umur: parseInt(newPatient.umur),
        nama_suami: newPatient.nama_suami,
        alamat: newPatient.alamat,
        phone: newPatient.phone,
        tanggal_reservasi: newPatient.tanggal_reservasi,
        jam_reservasi: newPatient.jam_reservasi,
        kehamilan_ke: parseInt(newPatient.kehamilan_ke),
        hpht: newPatient.hpht ? newPatient.hpht : null,
        jenis_usg: newPatient.jenis_usg,
        harga: newPatient.harga,
        no_antrian: antrianToSave
      }).eq("id", editingId);

      if (!error) {
          closeModal();
          fetchPatients();
      } else {
          alert("Gagal memperbarui data: " + error.message);
      }

    } else {
      const isDuplicate = patients.some(p => p.phone === newPatient.phone && p.tanggal_reservasi === newPatient.tanggal_reservasi && p.status !== 'batal');
      
      if (isDuplicate) {
          alert("Pendaftaran ditolak! Nomor WhatsApp ini sudah terdaftar pada antrian hari ini.");
          return;
      }

      const antrianHariItu = patients.filter(p => p.tanggal_reservasi === newPatient.tanggal_reservasi && p.status !== 'batal');
      if (antrianHariItu.length >= 25) {
          alert("Penuh! Kuota 25 pasien untuk hari ini sudah habis."); return;
      }

      const { data: antrianData } = await supabase
          .from("usg_reservations")
          .select("no_antrian")
          .eq("tanggal_reservasi", newPatient.tanggal_reservasi);
        
      let nextAntrian = 1;
      if (antrianData && antrianData.length > 0) {
          const maxAntrian = Math.max(0, ...antrianData.map(p => Number(p.no_antrian) || 0));
          nextAntrian = maxAntrian + 1;
      }

      const { error } = await supabase.from("usg_reservations").insert([{
          ...newPatient,
          umur: parseInt(newPatient.umur),
          kehamilan_ke: parseInt(newPatient.kehamilan_ke),
          hpht: newPatient.hpht ? newPatient.hpht : null,
          no_antrian: nextAntrian,
          status: "menunggu"
      }]);

      if (!error) {
          closeModal();
          fetchPatients();
      } else {
          alert("Gagal menambahkan data: " + error.message);
      }
    }
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

  const generateRekapBulanan = () => {
    const rekap = { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, totalPasien: 0, totalUang: 0 };
    const rekapLayanan = { usg2DBW: 0, usg2DCR: 0, usg3DBW: 0, usg3DCR:0, usg4DBW:0, usg4DCR: 0, iud: 0, promil: 0, kespro: 0 };

    patients.filter(p => p.status === 'selesai').forEach(p => {
      const day = parseInt(p.tanggal_reservasi.split("-")[2]); 
      rekap.totalPasien += 1; rekap.totalUang += p.harga;
      if (day <= 7) rekap.minggu1 += p.harga;
      else if (day <= 14) rekap.minggu2 += p.harga;
      else if (day <= 21) rekap.minggu3 += p.harga;
      else rekap.minggu4 += p.harga;

      const jenis = p.jenis_usg.toLowerCase();
      if (jenis.includes("2d (hitam putih)")) rekapLayanan.usg2DBW += 1;
      else if (jenis.includes("2d (berwarna)")) rekapLayanan.usg2DCR += 1;
      else if (jenis.includes("3d (hitam putih)")) rekapLayanan.usg3DBW += 1;
      else if (jenis.includes("3d (berwarna)")) rekapLayanan.usg3DCR += 1;
      else if (jenis.includes("4d (hitam putih)")) rekapLayanan.usg4DBW += 1;
      else if (jenis.includes("4d (berwarna)")) rekapLayanan.usg4DCR  += 1;
      else if (jenis.includes("iud")) rekapLayanan.iud += 1;
      else if (jenis.includes("program kehamilan")) rekapLayanan.promil += 1;
      else if (jenis.includes("kesehatan produksi")) rekapLayanan.kespro += 1;
    });

    return { rekap, rekapLayanan };
  };
  
  const { rekap: rekapData, rekapLayanan } = generateRekapBulanan();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto w-full min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-pink-500" /> Data Pemeriksaan USG
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Kelola antrian dan rekapitulasi data USG TPMB Nina.</p>
        </div>
        
        <div className="grid grid-cols-2 md:flex md:items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <button onClick={() => setActiveTab("harian")} className={`px-2 py-2 md:px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${activeTab === "harian" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
            <CalendarDays size={16} className="shrink-0"/> <span className="truncate">Harian</span>
          </button>
          <button onClick={() => setActiveTab("rekap")} className={`px-2 py-2 md:px-4 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${activeTab === "rekap" ? "bg-white shadow-sm text-pink-600" : "text-gray-500 hover:text-gray-700"}`}>
            <BarChart3 size={16} className="shrink-0"/> <span className="truncate">Rekap Bulanan</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-gray-600 shrink-0">Pilih Waktu:</span>
            <input 
              type={activeTab === "harian" ? "date" : "month"} 
              value={activeTab === "harian" ? selectedDate : selectedDate.substring(0, 7)} 
              onChange={(e) => setSelectedDate(activeTab === "harian" ? e.target.value : `${e.target.value}-01`)} 
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 text-sm font-medium text-gray-700" 
            />
         </div>
          
          {activeTab === "harian" && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
              <button 
                onClick={handleToggleLiburClick} 
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0 
                ${closedDays.includes(selectedDate) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
              >
                <CalendarOff size={18} /> {closedDays.includes(selectedDate) ? "Buka Jadwal" : "Tandai Libur"}
              </button>

              {hariIniBuka && (
                <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0">
                  <Plus size={18} /> Pasien Go-Show
                </button>
              )}
            </div>
          )}
      </div>

      {activeTab === "harian" && !hariIniBuka && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle size={24} className="shrink-0 mt-0.5" />
          <div className="w-full">
            <h4 className="font-bold text-sm md:text-base">USG Tutup pada hari ini.</h4>
            <p className="text-xs md:text-sm mt-1">
              {closedDays.includes(selectedDate) 
                ? "Jadwal USG pada tanggal ini telah ditutup secara manual oleh Admin." 
                : "Pelayanan USG hanya tersedia di hari Selasa, Jumat, Sabtu, dan Minggu."}
            </p>
          </div>
        </div>
      )}

      {activeTab === "harian" && (
        <div className="grid grid-cols-1 gap-4 w-full min-w-0">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
            <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Users size={20} className="md:w-6 md:h-6"/></div>
              <div><p className="text-[10px] md:text-xs text-gray-500 font-bold">Total Antrian</p><h3 className="text-lg md:text-2xl font-black text-gray-800">{patients.filter(p => p.status !== 'batal').length} <span className="text-[10px] md:text-sm font-medium text-gray-400">/ 25</span></h3></div>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Clock size={20} className="md:w-6 md:h-6"/></div>
              <div><p className="text-[10px] md:text-xs text-gray-500 font-bold">Menunggu</p><h3 className="text-lg md:text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'menunggu').length}</h3></div>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 size={20} className="md:w-6 md:h-6"/></div>
              <div><p className="text-[10px] md:text-xs text-gray-500 font-bold">Selesai</p><h3 className="text-lg md:text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'selesai').length}</h3></div>
            </div>
            <div className="bg-white p-3 md:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><XCircle size={20} className="md:w-6 md:h-6"/></div>
              <div><p className="text-[10px] md:text-xs text-gray-500 font-bold">Batal</p><h3 className="text-lg md:text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'batal').length}</h3></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full min-w-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] md:text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-3 md:p-4 pl-4 md:pl-6 text-center w-16 md:w-24">No</th>
                    <th className="p-3 md:p-4">Nama Pasien</th>
                    <th className="p-3 md:p-4">Layanan & Waktu</th>
                    <th className="p-3 md:p-4">Tarif</th>
                    <th className="p-3 md:p-4">Status</th>
                    <th className="p-3 md:p-4 pr-4 md:pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Memuat data...</td></tr>
                  ) : patients.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-medium text-sm">Belum ada pasien terdaftar.</td></tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-pink-50/30 transition-colors group">
                        <td className="p-3 md:p-4 pl-4 md:pl-6 text-center">
                          <div className="w-8 h-8 md:w-12 md:h-12 mx-auto bg-pink-100 text-pink-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-xl border border-pink-200 shadow-sm group-hover:bg-pink-500 group-hover:text-white transition-all">
                            {patient.no_antrian || "-"}
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <p className="font-bold text-gray-800 text-sm md:text-base">{patient.patient_name}</p>
                          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={10}/> {patient.phone}</p>
                        </td>
                        <td className="p-3 md:p-4">
                           <div className="flex flex-col gap-1 md:gap-1.5 items-start">
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[9px] md:text-[11px] font-bold border border-purple-100 whitespace-nowrap">{patient.jenis_usg}</span>
                              <span className="text-[9px] md:text-[11px] font-semibold text-gray-500 flex items-center gap-1 whitespace-nowrap"><Clock size={10} className="md:w-3 md:h-3"/> {patient.jam_reservasi || "-"}</span>
                           </div>
                        </td>
                        <td className="p-3 md:p-4 font-bold text-gray-700 text-sm whitespace-nowrap">{formatRupiah(patient.harga)}</td>
                        <td className="p-3 md:p-4">
                          <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border whitespace-nowrap ${patient.status === 'selesai' ? 'bg-green-50 text-green-700 border-green-200' : patient.status === 'batal' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {patient.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 md:p-4 pr-4 md:pr-6">
                          {patient.status === 'menunggu' && (
                            <div className="flex justify-end gap-1.5 md:gap-2">
                              <button onClick={() => handleEditClick(patient)} className="p-1.5 md:p-2.5 bg-white border border-gray-200 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 rounded-lg md:rounded-xl transition-all shadow-sm" title="Edit Data"><Pencil size={16} className="md:w-5 md:h-5" /></button>
                              <button onClick={() => updateStatus(patient.id, 'selesai')} className="p-1.5 md:p-2.5 bg-white border border-gray-200 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-lg md:rounded-xl transition-all shadow-sm" title="Tandai Selesai"><CheckCircle2 size={16} className="md:w-5 md:h-5" /></button>
                              <button onClick={() => updateStatus(patient.id, 'batal')} className="p-1.5 md:p-2.5 bg-white border border-gray-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-lg md:rounded-xl transition-all shadow-sm" title="Batalkan"><XCircle size={16} className="md:w-5 md:h-5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rekap" && (
        <div className="space-y-6 w-full">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1 md:mb-2">Minggu 1 (Tgl 1-7)</p>
                 <h4 className="text-base md:text-xl font-black text-blue-600 whitespace-nowrap">{formatRupiah(rekapData.minggu1)}</h4>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1 md:mb-2">Minggu 2 (Tgl 8-14)</p>
                 <h4 className="text-base md:text-xl font-black text-blue-600 whitespace-nowrap">{formatRupiah(rekapData.minggu2)}</h4>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1 md:mb-2">Minggu 3 (Tgl 15-21)</p>
                 <h4 className="text-base md:text-xl font-black text-blue-600 whitespace-nowrap">{formatRupiah(rekapData.minggu3)}</h4>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1 md:mb-2">Minggu 4 (Tgl 22+)</p>
                 <h4 className="text-base md:text-xl font-black text-blue-600 whitespace-nowrap">{formatRupiah(rekapData.minggu4)}</h4>
              </div>
           </div>

           <div className="mt-8 mb-6">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                <Stethoscope size={18} className="text-pink-500 md:w-5 md:h-5" /> Rincian Layanan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 2D B&W</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg2DBW} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 2D Color</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg2DCR} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 3D B&W</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg3DBW} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 3D Color</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg3DCR} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 4D B&W</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg4DBW} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">USG 4D Color</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.usg4DCR} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">Cek IUD</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.iud} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">Promil</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.promil} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-1">Kespro</p>
                  <h4 className="text-xl md:text-2xl font-black text-gray-800">{rekapLayanan.kespro} <span className="text-[10px] md:text-xs font-medium text-gray-400">Pasien</span></h4>
                </div>
              </div>
           </div>

           <div className="bg-gradient-to-br md:bg-gradient-to-r from-pink-500 to-rose-500 p-6 md:p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 w-full overflow-hidden">
              <div>
                <p className="text-pink-100 font-medium mb-1 text-xs md:text-base">Total Pemasukan USG Bulan Ini</p>
                <h2 className="text-2xl md:text-4xl font-bold">{formatRupiah(rekapData.totalUang)}</h2>
              </div>
              <div className="md:text-right w-full md:w-auto border-t border-pink-400/50 md:border-none pt-4 md:pt-0">
                <p className="text-pink-100 font-medium mb-1 text-xs md:text-base">Total Pasien Selesai</p>
                <h2 className="text-2xl md:text-4xl font-bold">{rekapData.totalPasien} <span className="text-lg md:text-2xl font-normal opacity-80">Orang</span></h2>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-2xl p-5 md:p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"><XCircle size={20} className="md:w-6 md:h-6"/></button>
            
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2">
              <Activity className="text-pink-500"/> {editingId ? "Edit Data Pasien" : "Input Pasien Manual"}
            </h2>
            
            <form onSubmit={handleSubmitPatient} className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Tanggal Reservasi</label>
                  <input type="date" required value={newPatient.tanggal_reservasi} onChange={handleDateChange} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Jam Operasional</label>
                  <input type="text" readOnly value={newPatient.jam_reservasi || getJamOperasional(newPatient.tanggal_reservasi) || "Pilih tanggal valid"} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-pink-50 border border-pink-200 text-pink-700 font-bold rounded-xl outline-none cursor-not-allowed text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Nama Pasien</label>
                  <input type="text" required value={newPatient.patient_name} onChange={(e) => setNewPatient({...newPatient, patient_name: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" placeholder="Nama Lengkap" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Umur</label>
                  <input type="number" required value={newPatient.umur} onChange={(e) => setNewPatient({...newPatient, umur: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" placeholder="Tahun" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Nama Suami</label>
                  <input type="text" required value={newPatient.nama_suami} onChange={(e) => setNewPatient({...newPatient, nama_suami: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" placeholder="Nama Suami" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">No WhatsApp</label>
                  <input type="tel" required value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" placeholder="08..." />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Alamat</label>
                <textarea required rows={2} value={newPatient.alamat} onChange={(e) => setNewPatient({...newPatient, alamat: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 resize-none text-sm" placeholder="Alamat lengkap" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Kehamilan Ke</label>
                  <input type="number" required value={newPatient.kehamilan_ke} onChange={(e) => setNewPatient({...newPatient, kehamilan_ke: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" min="1" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 flex justify-between">HPHT <span className="font-normal text-gray-400">(Opsional)</span></label>
                  <input type="date" value={newPatient.hpht} onChange={(e) => setNewPatient({...newPatient, hpht: e.target.value})} className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Pilih Paket USG</label>
                <select disabled={isTarifLoading} required className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm" value={newPatient.jenis_usg} onChange={(e) => {
                    const sel = tarifUsg.find(t => t.nama === e.target.value);
                    setNewPatient({...newPatient, jenis_usg: e.target.value, harga: sel ? sel.harga : 0});
                  }}>
                  <option value="" disabled>{isTarifLoading ? "Memuat Harga..." : "-- Pilih Jenis USG --"}</option>
                  {tarifUsg.map(tarif => <option key={tarif.nama} value={tarif.nama}>{tarif.nama} - {formatRupiah(tarif.harga)}</option>)}
                </select>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-2 md:gap-3">
                <button type="button" onClick={closeModal} className="w-full sm:w-1/3 px-4 py-2.5 md:py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-sm">Batal</button>
                <button type="submit" className="w-full sm:w-2/3 px-4 py-2.5 md:py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-pink-500/30 text-sm">
                  {editingId ? "Simpan Perubahan" : "Simpan Pasien Go-Show"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLiburModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 md:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsLiburModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"><XCircle size={20}/></button>
            
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <CalendarOff className="text-red-500"/> Tandai Libur / Tutup
            </h2>
            <p className="text-sm text-gray-500 mb-6">Tentukan rentang tanggal libur beserta alasannya.</p>
            
            <form onSubmit={submitLiburReason} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Mulai Tanggal</label>
                  <input 
                    type="date" 
                    required 
                    value={liburStartDate} 
                    onChange={(e) => setLiburStartDate(e.target.value)} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                  <input 
                    type="date" 
                    required 
                    value={liburEndDate} 
                    onChange={(e) => setLiburEndDate(e.target.value)} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">Alasan Libur</label>
                <input 
                  type="text" 
                  required 
                  value={liburReason} 
                  onChange={(e) => setLiburReason(e.target.value)} 
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm mb-3" 
                  placeholder="Contoh: Dokter berhalangan hadir" 
                />
              </div>

              <div className="pt-4 flex gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsLiburModalOpen(false)} className="w-1/3 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-sm">Batal</button>
                <button type="submit" className="w-2/3 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/30 text-sm">Simpan Libur</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
