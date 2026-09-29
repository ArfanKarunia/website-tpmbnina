"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import {
  Pencil,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Settings2,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";

interface USGPrice {
  id: string;
  package_name: string;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function HargaUSGCMSPage() {
  const supabase = createClient();
  const [prices, setPrices] = useState<USGPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<USGPrice | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    package_name: "",
    price: 0,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    setIsLoading(true);
    // Cek role user
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

    // Ambil data harga
    const { data, error } = await supabase
      .from("usg_prices")
      .select("*")
      .order("price", { ascending: true });

    if (!error && data) {
      setPrices(data);
    }
    setIsLoading(false);
  };

  const handleOpenModal = (priceItem: USGPrice | null = null) => {
    if (priceItem) {
      setEditingPrice(priceItem);
      setFormData({
        package_name: priceItem.package_name,
        price: priceItem.price,
        is_active: priceItem.is_active,
      });
    } else {
      setEditingPrice(null);
      setFormData({ package_name: "", price: 0, is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingPrice) {
        // Update
        const { error } = await supabase
          .from("usg_prices")
          .update({
            package_name: formData.package_name,
            price: formData.price,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPrice.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("usg_prices").insert([
          {
            package_name: formData.package_name,
            price: formData.price,
            is_active: formData.is_active,
          },
        ]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus paket "${name}"?`)) {
      const { error } = await supabase.from("usg_prices").delete().eq("id", id);
      if (error) alert("Gagal menghapus: " + error.message);
      else fetchData();
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading && !userRole) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCcw className="animate-spin text-pink-500" size={32} />
      </div>
    );
  }

  if (userRole !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Akses Ditolak</h2>
        <p className="text-gray-500 mt-2">
          Halaman ini hanya dapat diakses oleh Owner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings2 className="text-pink-600" /> Harga USG
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Kelola daftar layanan dan tarif USG secara dinamis.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 bg-pink-600 text-white px-4 py-2.5 rounded-xl hover:bg-pink-700 transition-colors text-sm font-bold shadow-md"
          >
            <Plus size={16} /> Tambah Paket
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr className="text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Nama Paket</th>
                <th className="px-6 py-4">Harga (Rp)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : prices.length > 0 ? (
                prices.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {p.package_name}
                    </td>
                    <td className="px-6 py-4 font-black text-pink-600">
                      {formatRupiah(p.price)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={14} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                          <XCircle size={14} /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.package_name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    Belum ada data paket USG.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-600 to-indigo-600 p-5 text-white relative flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings2 size={20} />{" "}
                {editingPrice ? "Edit Paket USG" : "Tambah Paket Baru"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nama Paket
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium text-sm text-gray-800"
                  value={formData.package_name}
                  onChange={(e) =>
                    setFormData({ ...formData, package_name: e.target.value })
                  }
                  placeholder="Contoh: 2D (Hitam Putih)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Harga (Rp)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium text-sm text-gray-800"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
                <span className="text-sm font-bold text-gray-700">
                  {formData.is_active ? "Status Aktif" : "Status Nonaktif"}
                </span>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 hover:bg-pink-700 transition-colors text-sm flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
