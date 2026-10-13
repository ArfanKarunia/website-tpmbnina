"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import {
  PieChart,
  Percent,
  Pencil,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  ShieldAlert,
  Wallet,
  Coins,
  ArrowRight
} from "lucide-react";

interface FinancialSplit {
  id: string;
  category_name: string;
  percentage: number;
  created_at?: string;
  updated_at?: string;
}

export default function PengaturanKeuanganPage() {
  const supabase = createClient();
  const [splits, setSplits] = useState<FinancialSplit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editList, setEditList] = useState<FinancialSplit[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // 1. Cek role user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role || null);
    }

    // 2. Fetch financial_splits
    const { data, error } = await supabase
      .from("financial_splits")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Gagal mengambil data alokasi:", error.message);
    } else if (data) {
      setSplits(data);
    }

    setIsLoading(false);
  };

  const handleOpenEdit = () => {
    // Clone splits ke editList
    setEditList(splits.map((s) => ({ ...s, percentage: Number(s.percentage) })));
    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handlePercentageChange = (id: string, newPercentage: string) => {
    const val = parseFloat(newPercentage) || 0;
    setEditList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, percentage: val } : item))
    );
  };

  // Hitung total persentase pada form edit
  const totalPercentageEdit = editList.reduce(
    (acc, item) => acc + (Number(item.percentage) || 0),
    0
  );
  const roundedTotal = Math.round(totalPercentageEdit * 100) / 100;
  const isExact100 = Math.abs(roundedTotal - 100) < 0.001;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExact100) {
      setErrorMessage(
        `Total persentase harus tepat 100%. Saat ini: ${roundedTotal}% (Selisih ${
          Math.round((100 - roundedTotal) * 100) / 100
        }%).`
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Update setiap kategori di Supabase
      for (const item of editList) {
        const { error } = await supabase
          .from("financial_splits")
          .update({
            percentage: item.percentage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (error) throw error;
      }

      setSuccessMessage("Alokasi persentase keuangan berhasil diperbarui!");
      setIsEditModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Warna aksen untuk visualisasi kategori
  const getCategoryColor = (index: number) => {
    const colors = [
      { bg: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-blue-500" },
      { bg: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
      { bg: "bg-amber-500", light: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" },
      { bg: "bg-rose-500", light: "bg-rose-50 text-rose-700 border-rose-200", bar: "bg-rose-500" },
      { bg: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200", bar: "bg-purple-500" },
      { bg: "bg-cyan-500", light: "bg-cyan-50 text-cyan-700 border-cyan-200", bar: "bg-cyan-500" },
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCcw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Memuat pengaturan alokasi...</p>
      </div>
    );
  }

  // Proteksi Role: Hanya Owner yang diizinkan mengakses
  if (userRole !== "owner") {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-red-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Akses Dibatasi</h2>
        <p className="text-sm text-gray-500 mb-6">
          Halaman Pengaturan Alokasi Keuangan hanya dapat diakses oleh akun <strong>Owner</strong>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  const currentTotal = splits.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <PieChart className="text-pink-500" size={26} />
            Pengaturan Alokasi Keuangan
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Atur persentase alokasi pembagian pemasukan klinik (Financial Splitter).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all border border-gray-200"
            title="Refresh Data"
          >
            <RefreshCcw size={18} />
          </button>
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-pink-500/20 transition-all"
          >
            <Pencil size={18} />
            Ubah Persentase
          </button>
        </div>
      </div>

      {/* Alert Notifikasi Sukses */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Ringkasan Banner Total & Progres Bar Keseluruhan */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Status Alokasi Saat Ini
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-gray-900">{currentTotal}%</span>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tepat 100%
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Total {splits.length} kategori alokasi tersimpan
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          {splits.map((item, idx) => {
            const color = getCategoryColor(idx);
            return (
              <div
                key={item.id}
                style={{ width: `${item.percentage}%` }}
                className={`${color.bar} transition-all duration-500 relative group`}
                title={`${item.category_name}: ${item.percentage}%`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
          {splits.map((item, idx) => {
            const color = getCategoryColor(idx);
            return (
              <div key={item.id} className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                <span className={`w-2.5 h-2.5 rounded-full ${color.bar} shrink-0`} />
                <span className="truncate">{item.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* List / Grid Kategori */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {splits.map((item, index) => {
          const color = getCategoryColor(index);
          return (
            <div
              key={item.id}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${color.light}`}
                  >
                    #{index + 1}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-extrabold border ${color.light}`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-800 group-hover:text-pink-600 transition-colors">
                  {item.category_name}
                </h3>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Porsi dari 100%</span>
                  <span className="font-semibold text-gray-700">{item.percentage} bagian</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${color.bar} rounded-full`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FORM EDIT PERSENTASE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-500 p-5 md:p-6 text-white relative">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <Pencil size={22} /> Ubah Persentase Alokasi
              </h2>
              <p className="text-pink-100 text-xs md:text-sm mt-1">
                Pastikan total penjumlahan seluruh kategori bernilai tepat 100%.
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-5 md:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Alert Error / Status Total */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 text-sm transition-all ${
                  isExact100
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {isExact100 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold flex items-center gap-2">
                    Total Saat Ini: <span className="text-base font-extrabold">{roundedTotal}%</span>
                  </div>
                  <p className="text-xs mt-0.5">
                    {isExact100
                      ? "Kombinasi persentase valid dan siap disimpan."
                      : `Total belum 100%. Anda perlu ${
                          roundedTotal < 100
                            ? `menambah ${Math.round((100 - roundedTotal) * 100) / 100}%`
                            : `mengurangi ${Math.round((roundedTotal - 100) * 100) / 100}%`
                        } lagi.`}
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* List Input Tiap Kategori */}
              <div className="space-y-3 pt-2">
                {editList.map((item, idx) => {
                  const color = getCategoryColor(idx);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${color.light}`}
                        >
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                            {item.category_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            required
                            value={item.percentage}
                            onChange={(e) => handlePercentageChange(item.id, e.target.value)}
                            className="w-24 pl-3 pr-7 py-2 text-right font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm"
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400 pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isExact100 || isSaving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
                    isExact100 && !isSaving
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-pink-500/25 cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <Save size={18} />
                  {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

