"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Wallet, TrendingUp, TrendingDown, FileText, Download, Plus, RefreshCcw, 
  Filter, Box, Pencil, Trash2, Search, X, Calendar, Activity, Receipt, PieChart
} from "lucide-react";
import AddTransactionModal from "../AddTransactionModal";
import ActionModal from "../ActionModal";
import RekapHarianModal from "../RekapHarianModal";

interface FinancialSplit {
  id: string;
  category_name: string;
  percentage: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  quantity: number;
  type: 'in' | 'out';
}

export default function KeuanganPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ROLE STATE
  const [userRole, setUserRole] = useState<string | null>(null);

  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // ACTION MODAL STATES
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"success" | "delete" | "confirm">("delete");
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  // FILTER TANGGAL STATES
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const firstDay = today.substring(0, 8) + '01';

  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [startDate, setStartDate] = useState(firstDay); 
  const [endDate, setEndDate] = useState(today); 

  // STATS STATE
  const [stats, setStats] = useState({ income: 0, expense: 0, net: 0 });

  // FINANCIAL SPLITS STATE
  const [splits, setSplits] = useState<FinancialSplit[]>([]);

  const fetchSplits = async () => {
    const { data, error } = await supabase
      .from("financial_splits")
      .select("id, category_name, percentage")
      .order("created_at", { ascending: true });
    if (!error && data) {
      setSplits(data);
    }
  };

  // REKAP HARIAN STATES
  const [isRekapModalOpen, setIsRekapModalOpen] = useState(false);

  // AMBIL ROLE USER SAAT HALAMAN DIMUAT
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data) setUserRole(data.role);
      }
    };
    fetchUserRole();
  }, [supabase]);

  // FUNGSI FETCH DARI SUPABASE
  const fetchTransactions = async () => {
    setIsLoading(true);
    
    let allFetchedData: Transaction[] = [];
    let fetchMore = true;
    let currPage = 0;
    const PAGE_SIZE = 1000; 

    while (fetchMore) {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(currPage * PAGE_SIZE, (currPage + 1) * PAGE_SIZE - 1); 

      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        break; 
      }

      if (data) {
        allFetchedData = [...allFetchedData, ...(data as Transaction[])];
        
        if (data.length < PAGE_SIZE) {
          fetchMore = false; 
        } else {
          currPage++; 
        }
      } else {
        fetchMore = false;
      }
    }

    const uniqueData = Array.from(new Map(allFetchedData.map(item => [item.id, item])).values())

    setTransactions(uniqueData);
    setIsLoading(false);
    fetchSplits();
  };

  useEffect(() => { 
    fetchTransactions(); 
    fetchSplits();
  }, [startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    // ROLE LOGIC: Sembunyikan "Operasional" & "Maintenance" untuk role selain owner
    if (userRole !== 'owner') {
      result = result.filter(t => 
        !(t.type === 'out' && (t.category === 'Operasional' || t.category === 'Maintenance'))
      );
    }

    return result.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === "All" || t.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [transactions, searchTerm, filterCategory, userRole]);

  useEffect(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'in') totalIncome += Number(t.amount);
      else totalExpense += Number(t.amount);
    });

    setStats({
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense
    });
  }, [filteredTransactions]);


  const handleDeleteClick = (id: string, description: string) => {
    setDeleteTarget({ id, name: description });
    setModalType("delete"); 
    setIsActionModalOpen(true);
  };

  const executeAction = async () => {
    if (modalType === "delete" && deleteTarget) {
        const { error } = await supabase.from("transactions").delete().eq("id", deleteTarget.id);
        if (error) {
            alert("Gagal menghapus: " + error.message);
            setIsActionModalOpen(false);
        } else {
            setModalType("success");
            fetchTransactions();
        }
    }
  };

  const handleCloseActionModal = () => {
      setIsActionModalOpen(false);
      setDeleteTarget(null);
  };

  const handleEdit = (trx: Transaction) => {
    setEditingTransaction(trx);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  };

  const printDate = (dateStr: string) => {
    if(!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full min-w-0">
      
      {/* HEADER YANG DIPERBARUI AGAR RESPONSIVE 100% DI MOBILE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="w-full lg:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
             Periode: <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md inline-block mt-1 sm:mt-0">{printDate(startDate)} - {printDate(endDate)}</span>
          </p>
        </div>
        
        {/* 🔥 Trik Flex 2 Baris untuk HP, 1 Baris untuk Laptop */}
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto mt-2 lg:mt-0">
           {/* Baris 1 di HP */}
           <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={fetchTransactions} className="flex-shrink-0 flex items-center justify-center p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
             </button>
             <button 
               onClick={() => setIsFilterOpen(!isFilterOpen)}
               className={`flex-1 sm:w-auto flex items-center justify-center gap-2 border px-3 py-2.5 rounded-xl transition-colors text-xs md:text-sm font-medium
                 ${isFilterOpen ? "bg-gray-100 border-gray-300 text-gray-900" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}
               `}
             >
               <Filter size={16} /> Filter
             </button>
           </div>
           
           {/* Baris 2 di HP */}
           <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={() => setIsRekapModalOpen(true)} className="flex-1 sm:w-auto flex items-center justify-center gap-1.5 bg-pink-100 text-pink-700 border border-pink-200 px-3 py-2.5 rounded-xl hover:bg-pink-200 transition-colors text-xs md:text-sm font-bold truncate">
               <Receipt size={16} className="shrink-0" /> Rekap Harian
             </button>

             <button onClick={handleAdd} className="flex-1 sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-xs md:text-sm font-bold shadow-md truncate">
               <Plus size={16} className="shrink-0" /> Catat Transaksi
             </button>
           </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      {isFilterOpen && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
           <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cari Transaksi</label>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Cari nama..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
              </div>
              
              <div className="w-full md:w-1/3 flex gap-2">
                 <div className="w-1/2">
                   <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dari Tanggal</label>
                   <input type="date" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                 </div>
                 <div className="w-1/2">
                   <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sampai Tanggal</label>
                   <input type="date" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                 </div>
              </div>

              <div className="w-full md:w-1/3">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kategori</label>
                 <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="All">Semua Kategori</option>
                    <option value="Layanan Medis">Layanan Medis</option>
                    <option value="Obat & Vitamin">Obat & Vitamin</option>
                    <option value="Alat Kesehatan">Alat Kesehatan</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Maintenance">Maintenance</option>
                 </select>
              </div>
              <button onClick={() => { setSearchTerm(""); setFilterCategory("All"); setStartDate(firstDay); setEndDate(today); }} className="w-full md:w-auto px-4 py-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium">Reset</button>
           </div>
        </div>
      )}

      {/* 🔥 STATS DENGAN ROLE-BASED ACCESS (HANYA MUNCUL JIKA OWNER) */}
      {userRole === "owner" && (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pemasukan (Terfilter)</p>
                <h3 className="text-xl md:text-2xl font-bold text-green-600">{isLoading ? "..." : formatRupiah(stats.income)}</h3>
              </div>
              <div className="absolute right-4 top-4 text-green-50 opacity-50 group-hover:scale-110 transition-transform"><Wallet size={60} className="md:w-20 md:h-20" /></div>
            </div>
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pengeluaran (Terfilter)</p>
                <h3 className="text-xl md:text-2xl font-bold text-red-500">{isLoading ? "..." : formatRupiah(stats.expense)}</h3>
              </div>
              <div className="absolute right-4 top-4 text-red-50 opacity-50 group-hover:scale-110 transition-transform"><FileText size={60} className="md:w-20 md:h-20" /></div>
            </div>
            <div className="bg-blue-600 p-5 md:p-6 rounded-2xl shadow-lg shadow-blue-200 relative overflow-hidden text-white group">
              <div className="relative z-10">
                <p className="text-[10px] md:text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Saldo Bersih</p>
                <h3 className="text-2xl md:text-3xl font-bold">{isLoading ? "..." : formatRupiah(stats.net)}</h3>
              </div>
              <div className="absolute -right-4 -bottom-4 text-blue-500 opacity-40 group-hover:scale-110 transition-transform"><Wallet size={100} className="md:w-[120px] md:h-[120px]" /></div>
            </div>
          </div>

          {/* SIMULASI ALOKASI DANA (FINANCIAL SPLITTER) */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                  <PieChart className="text-pink-500" size={20} />
                  Simulasi Alokasi Dana (Berdasarkan Total Pemasukan Terfilter)
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Dihitung otomatis dari total pemasukan: <span className="font-bold text-green-600">{formatRupiah(stats.income)}</span>
                </p>
              </div>
              <Link 
                href="/dashboard/cms/pengaturan-keuangan"
                className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1 w-fit"
              >
                Kelola Persentase &rarr;
              </Link>
            </div>

            {splits.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Belum ada data pengaturan alokasi persentase.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {splits.map((item) => {
                  const nominal = (stats.income * Number(item.percentage)) / 100;
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-700 line-clamp-1">
                          {item.category_name}
                        </span>
                        <span className="text-xs font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100 shrink-0">
                          {item.percentage}%
                        </span>
                      </div>
                      <div>
                        <p className="text-base md:text-lg font-extrabold text-gray-900">
                          {formatRupiah(nominal)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABEL RESPONSIVE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr className="text-xs uppercase tracking-wider">
                <th className="px-4 py-4 md:px-6">Tanggal</th>
                <th className="px-4 py-4 md:px-6">Keterangan</th>
                <th className="px-4 py-4 md:px-6">Kategori</th>
                <th className="px-4 py-4 md:px-6 text-right">Jumlah</th>
                <th className="px-4 py-4 md:px-6 text-center">Status</th>
                <th className="px-4 py-4 md:px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                 <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 md:px-6 md:py-4 text-gray-500 w-28 md:w-32 whitespace-nowrap text-xs md:text-sm">
                      {new Date(trx.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="font-bold text-gray-800 text-xs md:text-sm">{trx.description}</div>
                      {trx.quantity > 1 && (
                         <div className="flex items-center gap-1 mt-1 text-[10px] md:text-xs text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-md font-medium">
                            <Box size={10} className="md:w-3 md:h-3" /> {trx.quantity} Item x @{formatRupiah(trx.amount / trx.quantity)}
                         </div>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span className={`px-2 py-1 md:px-3 rounded-full text-[9px] md:text-xs font-bold whitespace-nowrap 
                        ${trx.category === 'Obat & Vitamin' ? 'bg-purple-100 text-purple-700' : 
                          trx.category === 'Layanan Medis' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {trx.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 md:px-6 md:py-4 text-right font-black whitespace-nowrap text-xs md:text-sm ${trx.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {trx.type === 'in' ? '+' : '-'} {formatRupiah(trx.amount)}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                      <span className="text-green-600 text-[10px] md:text-xs font-bold bg-green-50 px-2 py-1 rounded-md">Lunas</span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                       <div className="flex items-center justify-center gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(trx)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} className="md:w-4 md:h-4" /></button>
                          <button onClick={() => handleDeleteClick(trx.id, trx.description)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Data tidak ditemukan sesuai filter rentang tanggal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REKAP HARIAN */}
      <RekapHarianModal 
        isOpen={isRekapModalOpen} 
        onClose={() => setIsRekapModalOpen(false)} 
        transactions={transactions} 
        userRole={userRole} 
      />

      <AddTransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchTransactions(); }} transactionToEdit={editingTransaction} />
      <ActionModal isOpen={isActionModalOpen} onClose={handleCloseActionModal} onConfirm={executeAction} type={modalType} title={modalType === "delete" ? "Hapus Transaksi?" : "Berhasil!"} description={modalType === "delete" ? `Apakah Anda yakin ingin menghapus data "${deleteTarget?.name}"?` : "Data transaksi berhasil dihapus."} confirmText={modalType === "delete" ? "Hapus Sekarang" : "Tutup"} />
    </div>
  );
}
