"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Wallet, TrendingUp, TrendingDown, FileText, Download, Plus, RefreshCcw, 
  Filter, Box, Pencil, Trash2, Search 
} from "lucide-react";
import AddTransactionModal from "../AddTransactionModal";
import ActionModal from "../ActionModal";

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
  
  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // ACTION MODAL STATES
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"success" | "delete" | "confirm">("delete");
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  // FILTER STATES
  const [isFilterOpen, setIsFilterOpen] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 

  // STATS STATE
  const [stats, setStats] = useState({ income: 0, expense: 0, net: 0 });

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data as Transaction[] || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  // LOGIKA FILTERING
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === "All" || t.category === filterCategory;
      const matchMonth = filterMonth === "" || t.date.startsWith(filterMonth);
      return matchSearch && matchCategory && matchMonth;
    });
  }, [transactions, searchTerm, filterCategory, filterMonth]);

  // HITUNG STATISTIK
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

  // HAPUS DATA
  const handleDeleteClick = (id: string, description: string) => {
    setDeleteTarget({ id, name: description });
    setModalType("delete"); 
    setIsActionModalOpen(true);
  };

  const executeAction = async () => {
    if (modalType === "delete" && deleteTarget) {
        // Logika Reverse Stok (Jika dihapus, stok dikembalikan)
        const { data: oldTrx } = await supabase.from("transactions").select("*").eq("id", deleteTarget.id).single();
        if (oldTrx && oldTrx.category === "Obat & Vitamin") {
             // Cari obat dan kembalikan stoknya (Opsional: Butuh logika kompleks cari ID obat dari nama, 
             // untuk amannya kita skip auto-revert stok dari sini kecuali kita simpan medicine_id di transaksi)
        }

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

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-gray-500 text-sm">
             Laporan Bulan: <span className="font-bold text-gray-700">{filterMonth ? filterMonth : "Semua Periode"}</span>
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={fetchTransactions} className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
          
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl transition-colors text-sm font-medium
              ${isFilterOpen ? "bg-gray-100 border-gray-300 text-gray-900" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}
            `}
          >
            <Filter size={18} /> Filter
          </button>

          <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-lg shadow-blue-200">
            <Plus size={18} /> Catat Transaksi
          </button>
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
              <div className="w-full md:w-1/4">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Periode Bulan</label>
                 <input type="month" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
              </div>
              <div className="w-full md:w-1/4">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kategori</label>
                 <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="All">Semua Kategori</option>
                    <option value="Layanan Medis">Layanan Medis</option>
                    <option value="Obat & Vitamin">Obat & Vitamin</option> {/* PASTIKAN INI ADA */}
                    <option value="Alat Kesehatan">Alat Kesehatan</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Maintenance">Maintenance</option>
                 </select>
              </div>
              <button onClick={() => { setSearchTerm(""); setFilterCategory("All"); setFilterMonth(""); }} className="px-4 py-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium">Reset</button>
           </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pemasukan (Terfilter)</p>
            <h3 className="text-2xl font-bold text-green-600">{isLoading ? "..." : formatRupiah(stats.income)}</h3>
          </div>
          <div className="absolute right-4 top-4 text-green-50 opacity-50 group-hover:scale-110 transition-transform"><Wallet size={80} /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pengeluaran (Terfilter)</p>
            <h3 className="text-2xl font-bold text-red-500">{isLoading ? "..." : formatRupiah(stats.expense)}</h3>
          </div>
          <div className="absolute right-4 top-4 text-red-50 opacity-50 group-hover:scale-110 transition-transform"><FileText size={80} /></div>
        </div>
        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 relative overflow-hidden text-white group">
          <div className="relative z-10">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Saldo Bersih</p>
            <h3 className="text-3xl font-bold">{isLoading ? "..." : formatRupiah(stats.net)}</h3>
          </div>
          <div className="absolute -right-6 -bottom-6 text-blue-500 opacity-40 group-hover:scale-110 transition-transform"><Wallet size={120} /></div>
        </div>
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Jumlah</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                 <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-gray-500 w-32">
                      {new Date(trx.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{trx.description}</div>
                      {trx.quantity > 1 && (
                         <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-md font-medium">
                            <Box size={12} /> {trx.quantity} Item x @{formatRupiah(trx.amount / trx.quantity)}
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {/* LABEL KATEGORI DENGAN WARNA KHUSUS */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap 
                        ${trx.category === 'Obat & Vitamin' ? 'bg-purple-100 text-purple-700' : 
                          trx.category === 'Layanan Medis' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {trx.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${trx.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {trx.type === 'in' ? '+' : '-'} {formatRupiah(trx.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-md">Lunas</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(trx)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDeleteClick(trx.id, trx.description)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Data tidak ditemukan sesuai filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchTransactions(); }} transactionToEdit={editingTransaction} />
      <ActionModal isOpen={isActionModalOpen} onClose={handleCloseActionModal} onConfirm={executeAction} type={modalType} title={modalType === "delete" ? "Hapus Transaksi?" : "Berhasil!"} description={modalType === "delete" ? `Apakah Anda yakin ingin menghapus data "${deleteTarget?.name}"?` : "Data transaksi berhasil dihapus."} confirmText={modalType === "delete" ? "Hapus Sekarang" : "Tutup"} />
    </div>
  );
}