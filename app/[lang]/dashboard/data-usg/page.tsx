"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, Plus, Calendar, Clock, CheckCircle2, XCircle, 
  Users, Phone, Activity, AlertTriangle, CalendarDays, BarChart3
} from "lucide-react";


interface USGPasien {
  id: string;
  patient_name: string;
  phone: string;
  jenis_usg: string;
  harga: number;
  tanggal_reservasi: string;
  jam_reservasi: string;
  status: "menunggu" | "selesai" | "batal";
  no_antrian: number; 
  created_at: string;
}

const TARIF_USG = [
  { nama: "2D (Hitam Putih)", harga: 100000 },
  { nama: "2D (Berwarna)", harga: 120000 },
  { nama: "3D (Hitam Putih)", harga: 150000 },
  { nama: "3D (Berwarna)", harga: 180000 },
  { nama: "4D (Hitam Putih)", harga: 220000 },
  { nama: "4D (Berwarna)", harga: 250000 },
];

export default function DataUSGPage() {
  const supabase = createClient();
  const [waStatus, setWaStatus] = useState("connect");
  const [patients, setPatients] = useState<USGPasien[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"harian" | "rekap">("harian");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    patient_name: "", umur: "", nama_suami: "", alamat: "", phone: "",
    tanggal_reservasi: selectedDate, jam_reservasi: "", kehamilan_ke: "", hpht: "", jenis_usg: "", harga: 0
  });

  const fetchWaStatus = async () => {
    const { data } = await supabase
      .from("wa_device_status")
      .select("status")
      .eq("id", 1)
      .single();
    
    if (data) {
      setWaStatus(data.status);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchWaStatus(); 
    setNewPatient(prev => ({ ...prev, tanggal_reservasi: selectedDate, jam_reservasi: getJamOperasional(selectedDate) }));
    
    // (Opsional) Polling: Mengecek status WA setiap 30 detik secara otomatis
    const interval = setInterval(() => {
      fetchWaStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDate, activeTab]);

  // --- LOGIKA JAM OPERASIONAL & VALIDASI WAKTU HABIS ---
  const getJamOperasional = (dateString: string) => {
    if (!dateString) return "";
    const day = new Date(dateString).getDay();
    if (day === 2) return "15.00 - 17.00 WIB";
    if (day === 5) return "13.00 - 15.00 WIB";
    if (day === 6) return "14.00 - 16.00 WIB";
    if (day === 0) return "15.00 - 17.00 WIB";
    return "";
  };

  const isHariBuka = (dateString: string) => {
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
    fetchPatients();
    setNewPatient(prev => ({ ...prev, tanggal_reservasi: selectedDate, jam_reservasi: getJamOperasional(selectedDate) }));
  }, [selectedDate, activeTab]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("usg_reservations").update({ status: newStatus }).eq("id", id);
    if (!error) fetchPatients(); 
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isHariBuka(newPatient.tanggal_reservasi)) {
        alert("Pendaftaran gagal! Hari yang dipilih bukan jadwal USG."); return;
    }

    if (isWaktuHabis(newPatient.tanggal_reservasi)) {
        alert("Pendaftaran ditolak! Jam operasional USG untuk hari ini sudah berakhir. Silakan pilih hari lain."); return;
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
        setIsModalOpen(false);
        setNewPatient({ 
          patient_name: "", umur: "", nama_suami: "", alamat: "", phone: "",
          tanggal_reservasi: selectedDate, jam_reservasi: getJamOperasional(selectedDate), kehamilan_ke: "", hpht: "", jenis_usg: "", harga: 0 
        });
        fetchPatients();
    }
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

  const generateRekapMingguan = () => {
    const rekap = { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, totalPasien: 0, totalUang: 0 };
    patients.filter(p => p.status === 'selesai').forEach(p => {
      const day = parseInt(p.tanggal_reservasi.split("-")[2]); 
      rekap.totalPasien += 1; rekap.totalUang += p.harga;
      if (day <= 7) rekap.minggu1 += p.harga;
      else if (day <= 14) rekap.minggu2 += p.harga;
      else if (day <= 21) rekap.minggu3 += p.harga;
      else rekap.minggu4 += p.harga;
    });
    return rekap;
  };
  const rekapData = generateRekapMingguan();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* BANNER PERINGATAN WA MATI */}
      {waStatus === "disconnect" && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between border-2 border-red-800 animate-pulse">
          <div className="flex items-center gap-4">
            <AlertTriangle size={32} />
            <div>
              <h3 className="font-black text-lg">DARURAT: WhatsApp Bot Terputus!</h3>
              <p className="text-sm">Pasien tidak akan menerima pesan nomor antrian. Segera cas HP Bidan Nina atau Scan QR Ulang di Fonnte.</p>
            </div>
          </div>
          <button onClick={() => window.open('https://md.fonnte.com/new/device.php', '_blank')} className="bg-white text-red-700 px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-red-50 transition">
            Perbaiki Sekarang
          </button>
        </div>
      )}

      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-pink-500" /> Data Pemeriksaan USG
          </h1>
          <p className="text-gray-500 text-sm mt-1">Kelola antrian dan rekapitulasi data USG TPMB Nina.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <button onClick={() => setActiveTab("harian")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "harian" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}><CalendarDays size={16}/> Antrian Harian</button>
          <button onClick={() => setActiveTab("rekap")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "rekap" ? "bg-white shadow-sm text-pink-600" : "text-gray-500 hover:text-gray-700"}`}><BarChart3 size={16}/> Rekap Bulanan</button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
         <span className="text-sm font-bold text-gray-600">Pilih Waktu:</span>
         <input type={activeTab === "harian" ? "date" : "month"} value={activeTab === "harian" ? selectedDate : selectedDate.substring(0, 7)} onChange={(e) => setSelectedDate(activeTab === "harian" ? e.target.value : `${e.target.value}-01`)} className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium text-gray-700" />
          {activeTab === "harian" && hariIniBuka && (
            <button onClick={() => setIsModalOpen(true)} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"><Plus size={18} /> Pasien Go-Show</button>
          )}
      </div>

      {activeTab === "harian" && !hariIniBuka && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3"><AlertTriangle size={24} className="shrink-0" /><div><h4 className="font-bold">USG Tutup pada hari ini.</h4><p className="text-sm">Pelayanan USG hanya tersedia di hari <b>Selasa, Jumat, Sabtu, dan Minggu</b>.</p></div></div>
      )}

      {/* --- TABEL ANTRIAN HARIAN --- */}
      {activeTab === "harian" && (
        <>
          {/* INDIKATOR KUOTA & STATUS DIKEMBALIKAN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Users size={24}/></div>
              <div><p className="text-xs text-gray-500 font-bold">Total Antrian</p><h3 className="text-2xl font-black text-gray-800">{patients.filter(p => p.status !== 'batal').length} <span className="text-sm font-medium text-gray-400">/ 25</span></h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Clock size={24}/></div>
              <div><p className="text-xs text-gray-500 font-bold">Menunggu</p><h3 className="text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'menunggu').length}</h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0"><CheckCircle2 size={24}/></div>
              <div><p className="text-xs text-gray-500 font-bold">Selesai</p><h3 className="text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'selesai').length}</h3></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><XCircle size={24}/></div>
              <div><p className="text-xs text-gray-500 font-bold">Batal</p><h3 className="text-2xl font-black text-gray-800">{patients.filter(p => p.status === 'batal').length}</h3></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-4 pl-6 text-center w-24">Antrian</th>
                    <th className="p-4">Nama Pasien</th>
                    <th className="p-4">Layanan & Waktu</th>
                    <th className="p-4">Tarif</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Memuat data...</td></tr>
                  ) : patients.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-medium">Belum ada pasien terdaftar.</td></tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-pink-50/30 transition-colors group">
                        <td className="p-4 pl-6 text-center">
                          <div className="w-12 h-12 mx-auto bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center font-black text-xl border border-pink-200 shadow-sm group-hover:bg-pink-500 group-hover:text-white transition-all">
                            {patient.no_antrian || "-"}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-800 text-base">{patient.patient_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={10}/> {patient.phone}</p>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col gap-1.5 items-start">
                              <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[11px] font-bold border border-purple-100">{patient.jenis_usg}</span>
                              <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1"><Clock size={12}/> {patient.jam_reservasi || "-"}</span>
                           </div>
                        </td>
                        <td className="p-4 font-bold text-gray-700">{formatRupiah(patient.harga)}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${patient.status === 'selesai' ? 'bg-green-50 text-green-700 border-green-200' : patient.status === 'batal' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {patient.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 pr-6">
                          {patient.status === 'menunggu' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => updateStatus(patient.id, 'selesai')} className="p-2.5 bg-white border border-gray-200 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 rounded-xl transition-all shadow-sm" title="Tandai Selesai"><CheckCircle2 size={20} /></button>
                              <button onClick={() => updateStatus(patient.id, 'batal')} className="p-2.5 bg-white border border-gray-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl transition-all shadow-sm" title="Batalkan"><XCircle size={20} /></button>
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
        </>
      )}

      {/* --- TAB REKAP BULANAN --- */}
      {activeTab === "rekap" && (
        <div className="space-y-6">
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-xs font-bold text-gray-500 mb-2">Pemasukan Minggu 1 (Tgl 1-7)</p>
                 <h4 className="text-xl font-black text-blue-600">{formatRupiah(rekapData.minggu1)}</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-xs font-bold text-gray-500 mb-2">Pemasukan Minggu 2 (Tgl 8-14)</p>
                 <h4 className="text-xl font-black text-blue-600">{formatRupiah(rekapData.minggu2)}</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-xs font-bold text-gray-500 mb-2">Pemasukan Minggu 3 (Tgl 15-21)</p>
                 <h4 className="text-xl font-black text-blue-600">{formatRupiah(rekapData.minggu3)}</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-xs font-bold text-gray-500 mb-2">Pemasukan Minggu 4 (Tgl 22+)</p>
                 <h4 className="text-xl font-black text-blue-600">{formatRupiah(rekapData.minggu4)}</h4>
              </div>
           </div>

           <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-8 rounded-3xl text-white shadow-lg flex justify-between items-center">
              <div><p className="text-pink-100 font-medium mb-1">Total Pemasukan USG Bulan Ini</p><h2 className="text-4xl font-bold">{formatRupiah(rekapData.totalUang)}</h2></div>
              <div className="text-right"><p className="text-pink-100 font-medium mb-1">Total Pasien Selesai</p><h2 className="text-4xl font-bold">{rekapData.totalPasien} Orang</h2></div>
           </div>
        </div>
      )}

      {/* --- MODAL INPUT MANUAL (GO-SHOW) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><XCircle size={24}/></button>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity className="text-pink-500"/> Input Pasien Manual</h2>
            
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Reservasi</label>
                  <input type="date" required value={newPatient.tanggal_reservasi} onChange={handleDateChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" />
                  {/* PESAN PERINGATAN WAKTU HABIS DI FORM */}
                  {newPatient.tanggal_reservasi && isWaktuHabis(newPatient.tanggal_reservasi) && (
                    <p className="text-xs text-red-500 mt-2 font-bold">⚠️ Jam operasional hari ini telah lewat.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Jam Operasional</label>
                  <input type="text" readOnly value={newPatient.jam_reservasi || getJamOperasional(newPatient.tanggal_reservasi) || "Pilih tanggal valid"} className="w-full px-4 py-3 bg-pink-50 border border-pink-200 text-pink-700 font-bold rounded-xl outline-none cursor-not-allowed" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nama Pasien</label>
                  <input type="text" required value={newPatient.patient_name} onChange={(e) => setNewPatient({...newPatient, patient_name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" placeholder="Nama Lengkap" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Umur</label>
                  <input type="number" required value={newPatient.umur} onChange={(e) => setNewPatient({...newPatient, umur: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" placeholder="Tahun" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nama Suami</label>
                  <input type="text" required value={newPatient.nama_suami} onChange={(e) => setNewPatient({...newPatient, nama_suami: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" placeholder="Nama Suami" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">No WhatsApp</label>
                  <input type="tel" required value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" placeholder="08..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Alamat</label>
                <textarea required rows={2} value={newPatient.alamat} onChange={(e) => setNewPatient({...newPatient, alamat: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 resize-none" placeholder="Alamat lengkap" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Kehamilan Ke</label>
                  <input type="number" required value={newPatient.kehamilan_ke} onChange={(e) => setNewPatient({...newPatient, kehamilan_ke: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">HPHT <span className="font-normal text-gray-400">(Opsional)</span></label>
                  <input type="date" value={newPatient.hpht} onChange={(e) => setNewPatient({...newPatient, hpht: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-gray-700" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Paket USG</label>
                <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500" value={newPatient.jenis_usg} onChange={(e) => {
                    const sel = TARIF_USG.find(t => t.nama === e.target.value);
                    setNewPatient({...newPatient, jenis_usg: e.target.value, harga: sel ? sel.harga : 0});
                  }}>
                  <option value="" disabled>-- Pilih Jenis USG --</option>
                  {TARIF_USG.map(tarif => <option key={tarif.nama} value={tarif.nama}>{tarif.nama} - {formatRupiah(tarif.harga)}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-pink-500/30">Simpan Pasien Go-Show</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}