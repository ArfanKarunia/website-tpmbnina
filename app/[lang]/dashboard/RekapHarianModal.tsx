import { useState, useMemo } from "react";
import { Receipt, Calendar, Activity, Wallet, X, Download, RefreshCcw } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  type: 'in' | 'out';
  payment_method?: string | null;
}

// Helper penentuan metode pembayaran (prioritas payment_method, fallback tag deskripsi, default CASH)
const getTransactionMethod = (trx: Transaction): "CASH" | "QRIS" | "BPJS" | "BKKBN" => {
  if (trx.payment_method) {
    const pm = trx.payment_method.toUpperCase();
    if (pm === "QRIS") return "QRIS";
    if (pm === "BPJS") return "BPJS";
    if (pm === "BKKBN") return "BKKBN";
    return "CASH";
  }
  const desc = trx.description || "";
  if (desc.includes("[QRIS]")) return "QRIS";
  if (desc.includes("[BPJS]")) return "BPJS";
  if (desc.includes("[BKKBN]")) return "BKKBN";
  return "CASH";
};

interface RekapHarianModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  userRole: string | null;
}

export default function RekapHarianModal({ isOpen, onClose, transactions, userRole }: RekapHarianModalProps) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const [rekapDate, setRekapDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  const dailyRecap = useMemo(() => {
    let dailyData = transactions.filter(t => t.date === rekapDate);

    // LOGIKA ROLE: Sembunyikan "Operasional" & "Maintenance" untuk role selain owner
    if (userRole !== 'owner') {
      dailyData = dailyData.filter(t => 
        !(t.type === 'out' && (t.category === 'Operasional' || t.category === 'Maintenance'))
      );
    }

    const uniqueUmum = new Set();
    const uniqueKiaBpjs = new Set();
    const uniqueKiaNonBpjs = new Set();
    let totalIncome = 0;
    let incomeTunai = 0;
    let incomeQris = 0;
    let incomeBpjs = 0;
    let incomeBkkbn = 0;
    let totalExp = 0;
    const expCategories: Record<string, number> = {};

    dailyData.forEach(t => {
      // 1. LOGIKA HITUNG PASIEN (Jalan untuk in & out)
      let nameMatch = t.description.match(/(?:Jasa|Obat):\s*(.*?)\s*\(/);
      if (nameMatch) {
        let patientName = nameMatch[1].trim();
        if (t.description.includes('(Umum (BP))')) uniqueUmum.add(patientName);
        else if (t.description.includes('(KIA - BPJS)')) uniqueKiaBpjs.add(patientName);
        else if (t.description.includes('(KIA - Non BPJS)')) uniqueKiaNonBpjs.add(patientName);
      }

      // 2. LOGIKA HITUNG UANG (Pisahkan Tunai dan Non-Tunai)
      const amount = Number(t.amount) || 0;
      if (t.type === 'in') {
        totalIncome += amount;
        const method = getTransactionMethod(t);
        if (method === 'CASH') {
          incomeTunai += amount;
        } else if (method === 'QRIS') {
          incomeQris += amount;
        } else if (method === 'BPJS') {
          incomeBpjs += amount;
        } else if (method === 'BKKBN') {
          incomeBkkbn += amount;
        }
      } else {
        totalExp += amount;
        if (expCategories[t.category]) {
          expCategories[t.category] += amount;
        } else {
          expCategories[t.category] = amount;
        }
      }
    });

    const incomeNonTunai = incomeQris + incomeBpjs + incomeBkkbn;
    const netTunai = incomeTunai - totalExp;

    return {
      dailyData,
      countUmum: uniqueUmum.size, 
      countKiaBpjs: uniqueKiaBpjs.size, 
      countKiaNonBpjs: uniqueKiaNonBpjs.size,
      totalPasien: uniqueUmum.size + uniqueKiaBpjs.size + uniqueKiaNonBpjs.size,
      income: totalIncome,
      incomeTunai,
      incomeNonTunai,
      incomeQris,
      incomeBpjs,
      incomeBkkbn,
      expCategories,
      totalExp,
      net: netTunai,
      netTunai
    };
  }, [transactions, rekapDate, userRole]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wsData: any[][] = [
        ["LAPORAN KEUANGAN HARIAN - TPMB NINA RAHAYU"],
        ["Tanggal:", new Date(rekapDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
        [""],
        ["--- STATISTIK PASIEN ---"],
        ["Kategori", "Jumlah Pasien"],
        ["Umum (BP)", dailyRecap.countUmum],
        ["KIA - BPJS", dailyRecap.countKiaBpjs],
        ["KIA - Non BPJS", dailyRecap.countKiaNonBpjs],
        ["TOTAL PASIEN", dailyRecap.totalPasien],
        [""],
        ["--- RINGKASAN KEUANGAN ---"],
        ["Keterangan", "Nominal (Rp)"],
        ["Pemasukan Tunai", dailyRecap.incomeTunai],
        ["Pemasukan Non-Tunai - QRIS", dailyRecap.incomeQris],
        ["Pemasukan Non-Tunai - BPJS", dailyRecap.incomeBpjs],
        ["Pemasukan Non-Tunai - BKKBN", dailyRecap.incomeBkkbn],
        ["Total Pemasukan Non-Tunai", dailyRecap.incomeNonTunai],
        ["Total Pemasukan", dailyRecap.income],
      ];

      Object.entries(dailyRecap.expCategories).forEach(([cat, val]) => {
        wsData.push([`Pengeluaran (${cat})`, val]);
      });

      wsData.push(
        ["Total Pengeluaran", dailyRecap.totalExp],
        ["SALDO BERSIH (TUNAI)", dailyRecap.netTunai],
        [""],
        ["--- RINCIAN TRANSAKSI HARI INI ---"],
        ["Tipe", "Metode", "Kategori", "Keterangan", "Jumlah (Rp)"]
      );

      dailyRecap.dailyData.forEach(t => {
        wsData.push([
          t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
          getTransactionMethod(t),
          t.category,
          t.description,
          t.amount
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap_Harian");
      XLSX.writeFile(wb, `Rekap_Harian_${rekapDate}.xlsx`);
    } catch (error) {
      alert("Gagal melakukan export. Pastikan package 'xlsx' sudah terinstall.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        <div className="bg-gradient-to-r from-pink-600 to-rose-500 p-5 md:p-6 text-white relative">
           <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full backdrop-blur-md transition-colors"><X size={20} /></button>
           <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Receipt size={22} className="md:w-6 md:h-6"/> Rekap Harian Keuangan</h2>
           <p className="text-pink-100 text-xs md:text-sm mt-1">Cetak laporan harian untuk tutup kasir.</p>
        </div>
        
        <div className="p-4 md:p-6 overflow-y-auto">
            <div className="mb-4 md:mb-6 bg-gray-50 p-3 md:p-4 rounded-2xl border border-gray-100 flex items-center gap-3 md:gap-4">
               <div className="bg-white p-2 md:p-3 rounded-xl shadow-sm border border-gray-200"><Calendar className="text-gray-500 w-5 h-5 md:w-6 md:h-6"/></div>
               <div className="flex-1">
                  <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1 block">Pilih Tanggal Rekap</label>
                  <input type="date" className="w-full bg-transparent font-bold text-gray-800 outline-none text-sm md:text-base" value={rekapDate} onChange={(e) => setRekapDate(e.target.value)} />
               </div>
            </div>

            <div className="space-y-4">
               {/* BAGIAN PASIEN */}
               <div className="border border-gray-100 rounded-2xl p-3 md:p-4">
                  <h4 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 md:mb-3 flex items-center gap-2"><Activity size={12} className="md:w-3 md:h-3"/> Kunjungan Pasien</h4>
                  <div className="flex justify-between text-xs md:text-sm mb-2"><span className="text-gray-600">Umum (BP)</span><span className="font-bold text-gray-800">{dailyRecap.countUmum} Orang</span></div>
                  <div className="flex justify-between text-xs md:text-sm mb-2"><span className="text-gray-600">KIA - BPJS</span><span className="font-bold text-gray-800">{dailyRecap.countKiaBpjs} Orang</span></div>
                  <div className="flex justify-between text-xs md:text-sm mb-3"><span className="text-gray-600">KIA - Non BPJS</span><span className="font-bold text-gray-800">{dailyRecap.countKiaNonBpjs} Orang</span></div>
                  <div className="pt-2 md:pt-3 border-t border-dashed border-gray-200 flex justify-between"><span className="font-bold text-gray-800 text-xs md:text-sm">Total Pasien</span><span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xs md:text-sm">{dailyRecap.totalPasien} Orang</span></div>
               </div>

               {/* BAGIAN KEUANGAN */}
               <div className="border border-gray-100 rounded-2xl p-3 md:p-4 bg-gray-50/50">
                  <h4 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 md:mb-3 flex items-center gap-2"><Wallet size={12} className="md:w-3 md:h-3"/> Arus Kas Harian</h4>
                  
                  {/* Pemasukan Tunai */}
                  <div className="flex justify-between text-xs md:text-sm mb-2">
                    <span className="text-gray-700 font-medium">Pemasukan Tunai</span>
                    <span className="font-bold text-green-600">{formatRupiah(dailyRecap.incomeTunai)}</span>
                  </div>

                  {/* Pemasukan Non-Tunai */}
                  <div className="flex justify-between text-xs md:text-sm mb-1">
                    <span className="text-gray-600">Pemasukan Non-Tunai <span className="text-[10px] text-gray-400 italic">(masuk rekening)</span></span>
                    <span className="font-semibold text-blue-600">{formatRupiah(dailyRecap.incomeNonTunai)}</span>
                  </div>

                  {/* Rincian Non-Tunai per metode */}
                  <div className="pl-2 md:pl-3 border-l-2 border-blue-200 mb-2 space-y-1">
                    <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                      <span>• QRIS (masuk rekening)</span>
                      <span className="font-medium text-gray-700">{formatRupiah(dailyRecap.incomeQris)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                      <span>• BPJS (masuk rekening)</span>
                      <span className="font-medium text-gray-700">{formatRupiah(dailyRecap.incomeBpjs)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                      <span>• BKKBN (masuk rekening)</span>
                      <span className="font-medium text-gray-700">{formatRupiah(dailyRecap.incomeBkkbn)}</span>
                    </div>
                  </div>

                  {/* Info Total Pemasukan */}
                  <div className="flex justify-between text-xs md:text-sm py-1.5 border-t border-b border-gray-200/70 mb-3 bg-gray-100/50 -mx-1 px-2 rounded-lg">
                    <span className="text-gray-600 font-medium">Total Pemasukan (Tunai + Non-Tunai)</span>
                    <span className="font-bold text-gray-800">{formatRupiah(dailyRecap.income)}</span>
                  </div>
                  
                  {/* Pengeluaran per kategori */}
                  {Object.keys(dailyRecap.expCategories).length > 0 && (
                    <div className="pl-2 md:pl-3 border-l-2 border-red-200 mb-3 space-y-1.5 md:space-y-2">
                      {Object.entries(dailyRecap.expCategories).map(([cat, val]) => (
                        <div key={cat} className="flex justify-between">
                          <span className="text-gray-500 text-[10px] md:text-xs">Pengeluaran ({cat})</span>
                          <span className="font-medium text-red-500 text-[10px] md:text-xs">{formatRupiah(val as number)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Total Pengeluaran */}
                  <div className="flex justify-between text-xs md:text-sm mb-3">
                    <span className="text-gray-600">Total Pengeluaran</span>
                    <span className="font-bold text-red-600">{formatRupiah(dailyRecap.totalExp)}</span>
                  </div>
                  
                  {/* Saldo Bersih Tunai (Tutup Kasir) */}
                  <div className="pt-2 md:pt-3 border-t border-dashed border-gray-300 flex justify-between items-center mt-2">
                     <div>
                       <span className="font-black text-gray-800 text-xs md:text-sm block">SALDO BERSIH (TUNAI)</span>
                       <span className="text-[10px] text-gray-400 block">Tutup Kasir = Tunai - Pengeluaran</span>
                     </div>
                     <span className="font-black text-xl md:text-2xl text-blue-600">{formatRupiah(dailyRecap.netTunai)}</span>
                  </div>
               </div>
            </div>
        </div>

        <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex gap-2 md:gap-3">
           <button onClick={onClose} className="flex-1 px-3 py-2.5 md:px-4 md:py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all text-xs md:text-sm">Tutup</button>
           <button onClick={handleExportExcel} disabled={isExporting} className="flex-[2] px-3 py-2.5 md:px-4 md:py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex justify-center items-center gap-1.5 md:gap-2 text-xs md:text-sm">
              {isExporting ? <RefreshCcw size={16} className="animate-spin" /> : <><Download size={16}/> Download Excel</>}
           </button>
        </div>

      </div>
    </div>
  );
}

