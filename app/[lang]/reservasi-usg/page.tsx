"use client";

import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { User, Phone, Calendar, CheckCircle2, AlertCircle, Activity, MapPin, Heart, Baby, Clock } from "lucide-react";

const TARIF_USG = [
  { nama: "2D (Hitam Putih)", harga: 100000 },
  { nama: "2D (Berwarna)", harga: 120000 },
  { nama: "3D (Hitam Putih)", harga: 150000 },
  { nama: "3D (Berwarna)", harga: 180000 },
  { nama: "4D (Hitam Putih)", harga: 220000 },
  { nama: "4D (Berwarna)", harga: 250000 },
];

// 🔴 MASUKKAN TOKEN FONNTE KAMU DI SINI 🔴
const FONNTE_TOKEN = "Z9tf6bnLsyvC25xrPYWg"; 

export default function ReservasiUSGPublic() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [noAntrianFix, setNoAntrianFix] = useState(0); 
  
  const [newPatient, setNewPatient] = useState({
    patient_name: "", umur: "", nama_suami: "", alamat: "", phone: "",
    tanggal_reservasi: "", jam_reservasi: "", kehamilan_ke: "", hpht: "", jenis_usg: "", harga: 0,
  });

  // --- PERBAIKAN: Gunakan Zona Waktu WIB (Asia/Jakarta) untuk Tanggal Hari Ini ---
  const getTodayWIB = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  };
  const minDate = getTodayWIB();
  
  const formatRupiah = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

  // --- LOGIKA HARI BUKA & JAM OPERASIONAL ---
  const getJamOperasional = (dateString: string) => {
    if (!dateString) return "";
    // Pecah string tanggal untuk memastikan harinya akurat
    const [y, m, d] = dateString.split('-');
    const day = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();

    if (day === 2) return "15.00 - 17.00 WIB";
    if (day === 5) return "13.00 - 15.00 WIB";
    if (day === 6) return "14.00 - 16.00 WIB";
    if (day === 0) return "15.00 - 17.00 WIB";
    return ""; 
  };

  const isWaktuHabis = (dateString: string) => {
    if (!dateString) return false;

    const now = new Date();
    const todayISO = getTodayWIB();

    // Jika yang dipilih bukan hari ini (misal besok/lusa), berarti belum habis
    if (dateString !== todayISO) return false;

    // Ambil Jam dan Menit saat ini di zona WIB
    const currentHour = parseInt(now.toLocaleTimeString('en-GB', { hour: '2-digit', timeZone: 'Asia/Jakarta' }));
    const currentMinute = parseInt(now.toLocaleTimeString('en-GB', { minute: '2-digit', timeZone: 'Asia/Jakarta' }));
    const currentTime = currentHour + (currentMinute / 100); 

    const [y, m, d] = dateString.split('-');
    const day = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();

    let closingTime = 24; 
    if (day === 2) closingTime = 17.00; // Selasa 17.00
    if (day === 5) closingTime = 15.00; // Jumat 15.00
    if (day === 6) closingTime = 16.00; // Sabtu 16.00
    if (day === 0) closingTime = 17.00; // Minggu 17.00

    return currentTime >= closingTime;
  };

  const isHariBuka = (dateString: string) => {
    return getJamOperasional(dateString) !== "";
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const jam = getJamOperasional(selectedDate);
    setNewPatient({ ...newPatient, tanggal_reservasi: selectedDate, jam_reservasi: jam });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg("");

    try {
      if (!isHariBuka(newPatient.tanggal_reservasi)) throw new Error("Pelayanan USG hanya tersedia di hari Selasa, Jumat, Sabtu, dan Minggu.");
      if (isWaktuHabis(newPatient.tanggal_reservasi)) throw new Error("Jam operasional USG untuk hari ini sudah berakhir. Silakan pilih hari lain.");

      const { data: antrianCount, error: countError } = await supabase
        .from("usg_reservations").select("id").eq("tanggal_reservasi", newPatient.tanggal_reservasi).neq("status", "batal"); 

      if (countError) throw countError;
      if (antrianCount && antrianCount.length >= 25) throw new Error("Mohon maaf, kuota (25 Pasien) untuk tanggal tersebut sudah penuh.");
      
      const { data: lastAntrianData, error: lastAntrianError } = await supabase
        .from("usg_reservations")
        .select("no_antrian")
        .eq("tanggal_reservasi", newPatient.tanggal_reservasi)
        .not("no_antrian", "is", null)
        .order("no_antrian", { ascending: false })
        .limit(1);
      
      if (lastAntrianError) throw lastAntrianError;
      
      const currentMaxAntrian = (lastAntrianData && lastAntrianData.length > 0 && lastAntrianData[0].no_antrian) ? lastAntrianData[0].no_antrian : 0;
      const nextAntrian = currentMaxAntrian + 1;

      const { error: insertError } = await supabase.from("usg_reservations").insert([{
          patient_name: newPatient.patient_name, umur: parseInt(newPatient.umur), nama_suami: newPatient.nama_suami,
          alamat: newPatient.alamat, phone: newPatient.phone, tanggal_reservasi: newPatient.tanggal_reservasi,
          jam_reservasi: newPatient.jam_reservasi, kehamilan_ke: parseInt(newPatient.kehamilan_ke),
          hpht: newPatient.hpht ? newPatient.hpht : null, jenis_usg: newPatient.jenis_usg, harga: newPatient.harga, 
          status: "menunggu", no_antrian: nextAntrian
      }]);

      if (insertError) throw insertError;
      
      setNoAntrianFix(nextAntrian);
      setSuccess(true);

      const waMessage = `*RESERVASI BERHASIL* ✅\n\nHalo Ibu *${newPatient.patient_name}*,\nReservasi pemeriksaan USG Anda di TPMB Nina Rahayu telah terkonfirmasi.\n\n*Jadwal:* ${new Date(newPatient.tanggal_reservasi).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n*Waktu:* ${newPatient.jam_reservasi}\n*Layanan:* ${newPatient.jenis_usg}\n*No. Antrian:* ${nextAntrian}\n\nMohon hadir tepat waktu dan tunjukkan pesan ini kepada petugas kami saat kedatangan.\nTerima kasih dan sehat selalu! 💖`;

      const fonnteData = new FormData();
      fonnteData.append('target', newPatient.phone);
      fonnteData.append('message', waMessage);
      fonnteData.append('countryCode', '62');

      fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': FONNTE_TOKEN },
        body: fonnteData
      }).then(response => response.json())
        .then(res => console.log("Status WA Fonnte:", res))
        .catch(err => console.error("Gagal kirim WA:", err));

    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white max-w-md w-full p-6 md:p-8 rounded-3xl shadow-xl text-center border border-gray-100 animate-in zoom-in duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-pink-50 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Reservasi Berhasil!</h2>
            <p className="text-sm md:text-base text-gray-500 mb-6">Terima kasih, <b>{newPatient.patient_name}</b>. Kami telah mengirimkan detail reservasi ini ke WhatsApp Anda.</p>
            <div className="bg-pink-50 border-2 border-pink-100 rounded-2xl p-4 mb-6">
              <p className="text-pink-600 font-bold text-sm mb-1">NOMOR ANTRIAN ANDA</p>
              <h1 className="text-5xl font-black text-pink-500">{noAntrianFix}</h1>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100 mb-8 space-y-3">
              <div className="flex justify-between text-xs md:text-sm"><span className="text-gray-500">Tanggal:</span><span className="font-bold text-gray-700">{new Date(newPatient.tanggal_reservasi).toLocaleDateString('id-ID')}</span></div>
              <div className="flex justify-between text-xs md:text-sm"><span className="text-gray-500">Waktu:</span><span className="font-bold text-gray-700">{newPatient.jam_reservasi}</span></div>
              <div className="flex justify-between text-xs md:text-sm"><span className="text-gray-500">Layanan:</span><span className="font-bold text-gray-700 text-right">{newPatient.jenis_usg}</span></div>
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 text-sm md:text-base">Selesai</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50/50 p-4 font-sans py-8 md:py-12">
      <div className="bg-white w-full max-w-2xl p-5 md:p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-6 md:mb-8 pb-5 md:pb-6 border-b border-gray-100">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4"><Activity size={28} className="text-pink-600" /></div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Form Reservasi USG</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1 md:mt-2">Klinik TPMB Nina Rahayu</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-xs md:text-sm flex items-start gap-3 border border-red-100"><AlertCircle size={18} className="shrink-0 mt-0.5" /><span>{errorMsg}</span></div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 flex justify-between items-center">Pilih Tanggal <span className="text-[10px] md:text-xs text-pink-500 font-normal">*Sel, Jum, Sab, Min</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input type="date" required min={minDate} value={newPatient.tanggal_reservasi} onChange={handleDateChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium text-gray-700 text-sm md:text-base appearance-none" />
              </div>
              
              {/* PESAN PERINGATAN BUKAN HARI BUKA */}
              {newPatient.tanggal_reservasi && !isHariBuka(newPatient.tanggal_reservasi) && (
                <p className="text-xs text-red-500 mt-2 font-medium">⚠️ Tanggal ini bukan jadwal buka USG.</p>
              )}
              
              {/* PESAN PERINGATAN JAM HABIS DI FORM PUBLIK */}
              {newPatient.tanggal_reservasi && isHariBuka(newPatient.tanggal_reservasi) && isWaktuHabis(newPatient.tanggal_reservasi) && (
                <p className="text-xs text-red-500 mt-2 font-bold">⚠️ Mohon maaf, waktu pendaftaran untuk hari ini sudah ditutup.</p>
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Jam Operasional</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={18}/>
                <input type="text" readOnly value={newPatient.jam_reservasi || "Menunggu tanggal dipilih..."} className="w-full pl-10 pr-4 py-3 bg-pink-50 border border-pink-200 text-pink-700 font-bold rounded-xl outline-none text-sm md:text-base cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Nama Pasien</label>
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="text" required value={newPatient.patient_name} onChange={(e) => setNewPatient({...newPatient, patient_name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm md:text-base" placeholder="Nama Lengkap Istri" /></div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Umur Pasien</label>
              <div className="relative"><input type="number" required value={newPatient.umur} onChange={(e) => setNewPatient({...newPatient, umur: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm md:text-base" placeholder="Cth: 28" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-400">Thn</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Nama Suami</label>
              <div className="relative"><Heart className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="text" required value={newPatient.nama_suami} onChange={(e) => setNewPatient({...newPatient, nama_suami: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm md:text-base" placeholder="Nama Suami" /></div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">No HP (WhatsApp)</label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="tel" required value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm md:text-base" placeholder="08123456789" /></div>
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Alamat Lengkap</label>
            <div className="relative"><MapPin className="absolute left-3 top-3.5 text-gray-400" size={18}/><textarea required rows={2} value={newPatient.alamat} onChange={(e) => setNewPatient({...newPatient, alamat: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none resize-none text-sm md:text-base" placeholder="Sebutkan dusun/desa dan kecamatan" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Kehamilan Ke-</label>
              <div className="relative"><Baby className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="number" required value={newPatient.kehamilan_ke} onChange={(e) => setNewPatient({...newPatient, kehamilan_ke: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm md:text-base" placeholder="1, 2, 3..." min="1" /></div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 flex justify-between">HPHT <span className="text-[10px] md:text-xs text-gray-400 font-normal">(Bila lupa kosongi saja)</span></label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input type="date" value={newPatient.hpht} onChange={(e) => setNewPatient({...newPatient, hpht: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-gray-700 text-sm md:text-base appearance-none" /></div>
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1">Pilih Paket Layanan USG</label>
            <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium text-gray-700 text-sm md:text-base appearance-none" value={newPatient.jenis_usg} onChange={(e) => { const selected = TARIF_USG.find(t => t.nama === e.target.value); setNewPatient({...newPatient, jenis_usg: e.target.value, harga: selected ? selected.harga : 0}); }}>
              <option value="" disabled>-- Sentuh untuk memilih --</option>
              {TARIF_USG.map(tarif => <option key={tarif.nama} value={tarif.nama}>{tarif.nama} - {formatRupiah(tarif.harga)}</option>)}
            </select>
          </div>

          {/* PERBAIKAN: Tombol terkunci kalau waktu operasional sudah habis */}
          <button type="submit" disabled={loading || newPatient.tanggal_reservasi === "" || !isHariBuka(newPatient.tanggal_reservasi) || isWaktuHabis(newPatient.tanggal_reservasi)} className="w-full mt-4 md:mt-6 bg-[#ec4899] hover:bg-pink-600 text-white font-bold py-3.5 md:py-4 rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-sm md:text-base">
            {loading ? "Memproses Antrian..." : "Kirim Form Reservasi"}
          </button>
        </form>
      </div>
    </div>
  );
}