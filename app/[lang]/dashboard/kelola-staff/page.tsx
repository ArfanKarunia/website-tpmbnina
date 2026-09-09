"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { KeyRound, ShieldCheck, Users, Search, Pencil, Trash2, XCircle, Plus, AlertTriangle, RefreshCcw, CheckCircle2 } from "lucide-react";

export default function KelolaStafPage() {
  const supabase = createClient();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // STATES UNTUK MODAL EDIT PASSWORD
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // STATES UNTUK MODAL HAPUS
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // 🔥 STATES UNTUK CUSTOM ALERT MODAL
  const [alertModal, setAlertModal] = useState<{isOpen: boolean, type: 'success' | 'error', title: string, message: string}>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // FETCH DATA DARI TABEL PROFILES
  const fetchUsers = async () => {
    setIsLoadingData(true);
    const { data, error } = await supabase.from("profiles").select("*").order("role", { ascending: true });
    
    if (data && !error) {
      setUsersList(data);
    } else {
      console.error("Gagal mengambil data profiles:", error);
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [supabase]);

  // FUNGSI PENCARIAN (Berdasarkan nama dan role)
  const filteredUsers = usersList.filter(u => {
    const nameMatch = (u.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = (u.role || "").toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || roleMatch;
  });

  // --- ACTIONS ---

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showAlert("error", "Validasi Gagal", "Password baru harus memiliki minimal 6 karakter!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/service-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: selectedUser.id, newPassword }), 
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        
        if (res.ok && data.success) {
          setIsEditModalOpen(false); // Tutup modal form dulu
          showAlert("success", "Pembaruan Berhasil!", `Kata sandi baru untuk akun ${selectedUser.name} sudah bisa digunakan.`);
        } else {
          showAlert("error", "Pembaruan Gagal", data.error || "Terjadi kesalahan pada sistem Supabase.");
        }
      } else {
        const textError = await res.text();
        console.error("SERVER CRASH:", textError);
        showAlert("error", "Server Error", "Gagal menghubungi server API. Pastikan API Route sudah benar.");
      }
    } catch (err: any) {
      showAlert("error", "Kesalahan Jaringan", err.message || "Periksa koneksi internet Anda.");
    }
    setLoading(false);
  };

  const confirmDeleteUser = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delete-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userToDelete.id }), 
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setIsDeleteModalOpen(false); // Tutup modal hapus dulu
        showAlert("success", "Penghapusan Berhasil!", `Akses untuk ${userToDelete.name} berhasil dicabut dari sistem.`);
        fetchUsers();
      } else {
        showAlert("error", "Penghapusan Gagal", data.error || "Terjadi kesalahan pada server saat menghapus.");
      }
    } catch (err: any) {
      showAlert("error", "Kesalahan Jaringan", err.message || "Periksa koneksi internet Anda.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto w-full min-w-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">Kelola hak akses, kata sandi, dan role staf TPMB Nina.</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={fetchUsers} className="flex-shrink-0 flex items-center justify-center p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCcw size={18} className={isLoadingData ? "animate-spin" : ""} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-md">
            <Plus size={18} /> Tambah Pengguna
          </button>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama atau role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm" 
          />
        </div>
      </div>

      {/* TABEL PENGGUNA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6 w-16 text-center">No</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Peran (Role)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingData ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Memuat data pengguna...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Pengguna tidak ditemukan.</td></tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 pl-6 text-center text-sm font-bold text-gray-400">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{user.name || "Staf Baru"}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                            <ShieldCheck size={12} className="text-green-500" /> Akun Terverifikasi
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border whitespace-nowrap 
                        ${user.role === 'owner' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-pink-50 text-pink-700 border-pink-200'}
                      `}>
                        {user.role || "staff"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">
                        Aktif
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(user)} 
                          className="p-2 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-colors shadow-sm" 
                          title="Ganti Password"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(user)} 
                          className="p-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors shadow-sm" 
                          title="Hapus Akun"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL EDIT PASSWORD --- */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"><XCircle size={20}/></button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              <KeyRound className="text-blue-500" /> Ganti Kata Sandi
            </h2>
            <p className="text-sm text-gray-500 mb-6">Ubah kata sandi untuk akun <span className="font-bold text-gray-700">{selectedUser.name}</span>.</p>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password Baru</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/3 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-sm">Batal</button>
                <button type="submit" disabled={loading} className="w-2/3 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-sm">
                  {loading ? "Menyimpan..." : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI HAPUS --- */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">Hapus Pengguna?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus akses untuk <span className="font-bold text-gray-800">{userToDelete.name}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex gap-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-1/2 px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-sm">Batal</button>
              <button onClick={confirmDeleteUser} disabled={loading} className="w-1/2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/30 text-sm">
                {loading ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 
              ${alertModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
            >
              {alertModal.type === 'success' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">{alertModal.title}</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {alertModal.message}
            </p>
            
            <button 
              onClick={closeAlert} 
              className={`w-full px-4 py-3 text-white rounded-xl font-bold transition-all shadow-lg text-sm
                ${alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'}`}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

    </div>
  );
}