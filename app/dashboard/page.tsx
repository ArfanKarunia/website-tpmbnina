"use client";

import { 
  Users, 
  Clock, 
  CalendarCheck, 
  AlertCircle, 
  MessageCircle,
  MoreVertical,
  // CheckCircle2 // Tidak dipakai, bisa dihapus jika mau
} from "lucide-react";

// --- MOCK DATA ---
const todayStats = {
  totalPasien: 18,
  pendapatan: "Rp 1.850.000",
  sisaSlot: 4, 
  requestBatal: 1, 
};

const sessions = [
  {
    id: 1,
    name: "Sesi Pagi",
    time: "08:00 - 12:00",
    status: "Penuh",
    capacity: "10/10",
    color: "bg-green-100 text-green-700",
    patients: [
      { name: "Siti Aminah", service: "Imunisasi Bayi", time: "08:20", status: "Selesai" },
      { name: "Rina Wati", service: "USG 4D", time: "09:00", status: "Selesai" },
      { name: "Budi Santoso", service: "Cek Kolesterol", time: "10:30", status: "Diperiksa" },
    ]
  },
  {
    id: 2,
    name: "Sesi Siang",
    time: "13:00 - 17:00",
    status: "Tersedia",
    capacity: "5/10",
    color: "bg-blue-100 text-blue-700",
    patients: [
      { name: "Dewi Persik", service: "KB Suntik", time: "13:15", status: "Menunggu" },
      { name: "Ayu Tingting", service: "Konsultasi Hamil", time: "14:00", status: "Booked" },
    ]
  },
  {
    id: 3,
    name: "Sesi Malam",
    time: "18:30 - 21:00",
    status: "Tersedia",
    capacity: "2/8",
    color: "bg-indigo-100 text-indigo-700",
    patients: [
      { name: "Lesti Kejora", service: "USG 2D", time: "19:00", status: "Booked" },
    ]
  }
];

const ancReminders = [
  { name: "Ny. Siska", usia: "32 Minggu", status: "Urgent", date: "Harusnya Kemarin" },
  { name: "Ny. Ratna", usia: "28 Minggu", status: "Minggu Ini", date: "10 Des 2025" },
  { name: "Ny. Farah", usia: "38 Minggu", status: "Minggu Ini", date: "12 Des 2025" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      
      {/* --- 1. HEADER RINGKASAN --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Kartu Total Pasien */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pasien Hari Ini</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{todayStats.totalPasien}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
        </div>

        {/* Kartu Sisa Slot */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sisa Slot Kosong</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{todayStats.sisaSlot}</h3>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
        </div>

        {/* Kartu Pendapatan */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimasi Pendapatan</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{todayStats.pendapatan}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <span className="font-bold text-lg">Rp</span>
          </div>
        </div>

        {/* Kartu Notifikasi */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Permintaan Batal</p>
            <h3 className="text-3xl font-bold text-red-500 mt-1">{todayStats.requestBatal}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* --- 2. MAIN CONTENT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Jadwal Praktik Hari Ini</h2>
            <p className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Senin, 08 Des 2025</p>
          </div>

          <div className="grid gap-6">
            {sessions.map((sesi) => (
              <div key={sesi.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${sesi.color}`}>
                      {sesi.name}
                    </span>
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Clock size={14} /> {sesi.time}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-gray-700">
                    Kapasitas: {sesi.capacity}
                  </div>
                </div>

                <div className="p-4">
                  {sesi.patients.length > 0 ? (
                    <div className="space-y-3">
                      {sesi.patients.map((patient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm">{patient.name}</h4>
                              <p className="text-xs text-gray-500">{patient.service}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-600">{patient.time}</span>
                            
                            <span className={`text-xs px-2 py-1 rounded-full font-medium
                              ${patient.status === 'Selesai' ? 'bg-green-100 text-green-700' : 
                                patient.status === 'Diperiksa' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}
                            `}>
                              {patient.status}
                            </span>
                            
                            <button className="text-gray-400 hover:text-gray-600">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-sm italic">
                      Belum ada reservasi di sesi ini.
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-6 py-2 border-t border-gray-100 text-center">
                   <button className="text-xs text-blue-600 font-bold hover:underline">
                     + Tambah Pasien Manual
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KOLOM KANAN (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck size={20} className="text-pmb-pink" />
                Jadwal Kontrol
              </h3>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">3 Urgent</span>
            </div>

            <div className="space-y-4">
              {ancReminders.map((mom, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 hover:border-pmb-pink/30 hover:bg-pink-50/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{mom.name}</h4>
                      <p className="text-xs text-gray-500">Usia: {mom.usia}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mom.status === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                      {mom.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">Jadwal: {mom.date}</p>
                    <button 
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
                      title="Ingatkan via WhatsApp"
                    >
                      <MessageCircle size={14} /> Ingatkan
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Lihat Semua Data Ibu Hamil
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <h4 className="font-bold text-lg mb-1">Ada yang Darurat?</h4>
            <p className="text-blue-100 text-xs mb-4">Buat rujukan rumah sakit dengan cepat.</p>
            <button className="bg-white text-blue-600 w-full py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
              Buat Surat Rujukan
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}