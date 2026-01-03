"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import Link from "next/link";
import { 
  Users, 
  Clock, 
  Activity, 
  AlertCircle, 
  MessageCircle, 
  MoreVertical, 
  FileOutput, 
  Baby,
  UserPlus
} from "lucide-react";

import AddReservationModal from "./AddReservationModal"; 

type SessionData = {
  id: string;
  name: string;
  timeRange: string;
  color: string;
  capacity: number;
  patients: any[];
};

type SmartMom = {
  id: string;
  name: string;
  hpht: string;
  hpl: string;
  usiaKehamilan: number;
  trimester: number;
  status: string;
  phone: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // --- STATE DATA ---
  const [stats, setStats] = useState({
    totalPasien: 0,
    pendapatan: 0,
    sisaSlot: 30, 
    requestBatal: 0 
  });

  const [sessions, setSessions] = useState<SessionData[]>([
    { id: "pagi", name: "Sesi Pagi", timeRange: "08:00 - 12:00", color: "bg-green-100 text-green-700", capacity: 10, patients: [] },
    { id: "siang", name: "Sesi Siang", timeRange: "13:00 - 17:00", color: "bg-blue-100 text-blue-700", capacity: 10, patients: [] },
    { id: "malam", name: "Sesi Malam", timeRange: "18:30 - 21:00", color: "bg-indigo-100 text-indigo-700", capacity: 10, patients: [] },
  ]);

  const [ancPatients, setAncPatients] = useState<SmartMom[]>([]);

  // --- HELPER ---
  const calculatePregnancy = (hphtDate: string) => {
      const hpht = new Date(hphtDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - hpht.getTime());
      const weeks = Math.floor(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 7);
      const hplDate = new Date(hpht);
      hplDate.setDate(hplDate.getDate() + 280);
      
      let trimester = 1;
      let status = "Kontrol Rutin";
      if (weeks > 13 && weeks <= 27) trimester = 2;
      else if (weeks > 27) {
          trimester = 3;
          status = weeks >= 37 ? "SIAGA PERSALINAN" : "Pantau Gerak Janin";
      }

      return { 
          weeks, 
          hpl: hplDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 
          status, 
          trimester 
      };
  };

  const fetchDashboardData = async () => {
      setLoading(true);
      
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const today = `${year}-${month}-${day}`;
      
      // 1. Fetch Queues
      const { data: queues, error: errQueue } = await supabase
        .from('queues')
        .select(`id, queue_date, session, status, service_type, patient_name, patient_id`)
        .eq('queue_date', today) 
        .order('created_at', { ascending: true });

      // 2. Fetch Transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'in')
        .gte('date', today);
      
      if (errQueue) console.error("Error fetching queues:", errQueue);

      // Hitung Stats (Total tetap menghitung semua yg daftar hari ini)
      const totalP = queues?.length || 0; 
      const totalIncome = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const activeQueueCount = queues?.filter(q => q.status === 'Menunggu' || q.status === 'Diperiksa').length || 0;

      setStats({
          totalPasien: totalP,
          pendapatan: totalIncome,
          sisaSlot: Math.max(0, 30 - activeQueueCount),
          requestBatal: 0
      });

      // --- HITUNG 3 SESI ---
      const newSessions = [
        { id: "pagi", name: "Sesi Pagi", timeRange: "08:00 - 12:00", color: "bg-green-100 text-green-700", capacity: 10, patients: [] as any[] },
        { id: "siang", name: "Sesi Siang", timeRange: "13:00 - 17:00", color: "bg-blue-100 text-blue-700", capacity: 10, patients: [] as any[] },
        { id: "malam", name: "Sesi Malam", timeRange: "18:30 - 21:00", color: "bg-indigo-100 text-indigo-700", capacity: 10, patients: [] as any[] },
      ];

      queues?.forEach((q: any) => {
          if (q.status === 'Selesai' || q.status === 'Batal') return; 

          const pData = {
              id: q.id, 
              name: q.patient_name || "Tanpa Nama",
              service: q.service_type || "Umum",
              time: q.session, 
              status: q.status || "Menunggu"
          };

          const sessionStr = (q.session || "").toLowerCase();

          if (sessionStr.includes("pagi")) {
            newSessions[0].patients.push(pData);
          } else if (sessionStr.includes("siang") || sessionStr.includes("sore")) {
            newSessions[1].patients.push(pData);
          } else if (sessionStr.includes("malam")) {
            newSessions[2].patients.push(pData);
          } else {
             newSessions[0].patients.push(pData);
          }
      });

      setSessions(newSessions);

      // Fetch Ibu Hamil
      const { data: moms } = await supabase
        .from('patients')
        .select('*')
        .not('hpht', 'is', null) 
        .order('hpht', { ascending: true })
        .limit(5);
      
      if (moms) {
          setAncPatients(moms.map((m) => {
              const calc = calculatePregnancy(m.hpht);
              return {
                  id: m.id, name: m.name, hpht: m.hpht, phone: m.phone,
                  usiaKehamilan: calc.weeks, hpl: calc.hpl, status: calc.status, trimester: calc.trimester
              };
          }));
      }
      setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const updateStatus = async (queueId: string, newStatus: string) => {
      await supabase.from('queues').update({ status: newStatus }).eq('id', queueId);
      fetchDashboardData(); 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pasien</p><h3 className="text-3xl font-bold text-gray-800 mt-1">{loading ? "..." : stats.totalPasien}</h3></div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Users size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sisa Slot</p><h3 className="text-3xl font-bold text-gray-800 mt-1">{loading ? "..." : stats.sisaSlot}</h3></div>
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600"><Clock size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendapatan</p><h3 className="text-xl font-bold text-gray-800 mt-1">{loading ? "..." : `Rp ${stats.pendapatan.toLocaleString('id-ID')}`}</h3></div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600"><Activity size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batal</p><h3 className="text-3xl font-bold text-red-500 mt-1">{stats.requestBatal}</h3></div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500"><AlertCircle size={24} /></div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI (2/3): JADWAL SESI */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="text-lg font-bold text-gray-800">Jadwal Praktik Hari Ini</h2>
                <p className="text-xs text-gray-500">Antrian Aktif (Menunggu / Diperiksa).</p>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-mono text-xs hidden sm:block">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => setIsManualOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
                    <UserPlus size={16} /> Input Manual
                </button>
            </div>
          </div>

          <div className="grid gap-6">
            {sessions.map((sesi) => (
              <div key={sesi.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${sesi.color}`}>{sesi.name}</span>
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1"><Clock size={14} /> {sesi.timeRange}</span>
                  </div>
                  <div className="text-sm font-bold text-gray-700">Antrian: {sesi.patients.length} Orang</div>
                </div>
                
                <div className="p-4">
                  {sesi.patients.length > 0 ? (
                    <div className="space-y-3">
                      {sesi.patients.map((patient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl transition-colors group border bg-white hover:bg-blue-50 border-gray-100 hover:border-blue-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase bg-blue-100 text-blue-600">{patient.name.charAt(0)}</div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm">{patient.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-1">{patient.service}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                patient.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                'bg-blue-50 text-blue-600 border-blue-100 animate-pulse'
                            }`}>
                                {patient.status}
                            </span>
                            
                            {/* Tombol Status */}
                            {patient.status === 'Menunggu' && (
                                <button onClick={() => updateStatus(patient.id, 'Diperiksa')} className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
                                    Panggil
                                </button>
                            )}
                            {patient.status === 'Diperiksa' && (
                                <button onClick={() => updateStatus(patient.id, 'Selesai')} className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm">
                                    Selesai
                                </button>
                            )}
                            <button className="text-gray-300 hover:text-gray-600"><MoreVertical size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      Tidak ada antrian di sesi ini.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KOLOM KANAN (Ibu Hamil) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Baby size={20} className="text-pink-500" /> Pantauan Bumil</h3>
              <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-full font-bold">Auto-HPL</span>
            </div>
            <div className="space-y-4">
              {ancPatients.length > 0 ? ancPatients.map((mom, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition-all group bg-white ${mom.usiaKehamilan >= 37 ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:border-pink-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">{mom.name} {mom.trimester === 3 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}</h4>
                      <p className="text-xs text-gray-500">HPL: <span className="font-mono font-bold text-gray-700">{mom.hpl}</span></p>
                    </div>
                    <div className="text-right">
                        <span className="block text-xl font-bold text-pink-600">{mom.usiaKehamilan}</span>
                        <span className="text-[10px] text-gray-400">Minggu</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100/50">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mom.usiaKehamilan >= 37 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{mom.status}</span>
                    <a href={`https://wa.me/${mom.phone}`} target="_blank" className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors shadow-sm"><MessageCircle size={12} /> Hubungi</a>
                  </div>
                </div>
              )) : (
                  <div className="text-center py-8 text-gray-400 text-sm italic"><Baby size={32} className="mx-auto mb-2 opacity-20"/>Belum ada data HPHT pasien.</div>
              )}
            </div>
            <Link href="/dashboard/kehamilan" className="block w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors text-center">
              Lihat Data Kehamilan
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileOutput size={100} /></div>
            <h4 className="font-bold text-lg mb-1 relative z-10">Rujukan Darurat?</h4>
            <p className="text-blue-100 text-xs mb-4 relative z-10">Buat surat rujukan RS dengan cepat format BPJS/Umum.</p>
            <button className="bg-white text-blue-600 w-full py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm relative z-10 flex items-center justify-center gap-2"><FileOutput size={16}/> Buat Surat Rujukan</button>
          </div>
        </div>
      </div>

      <AddReservationModal isOpen={isManualOpen} onClose={() => { setIsManualOpen(false); fetchDashboardData(); }} />

    </div>
  );
}