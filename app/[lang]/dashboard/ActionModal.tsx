"use client";

import { CheckCircle, Trash2, AlertTriangle, Info, X } from "lucide-react";

// Tipe Modal yang didukung
type ModalType = "success" | "delete" | "confirm";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void; // Opsional (hanya untuk delete/confirm)
  type: ModalType;
  title: string;
  message?: string;
  description?: string;
  isLoading?: boolean; // Untuk loading state tombol aksi
  confirmText?: string; // Custom teks tombol (misal: "Hapus", "Simpan")
}

export default function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  description,
  isLoading = false,
  confirmText,
}: ActionModalProps) {
  
  if (!isOpen) return null;

  // --- KONFIGURASI TAMPILAN BERDASARKAN TIPE ---
  const config = {
    success: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      btnColor: "bg-green-600 hover:bg-green-700",
      defaultBtnText: "OK, Mengerti",
      showCancel: false, // Sukses cuma butuh 1 tombol
    },
    delete: {
      icon: Trash2,
      color: "text-red-600",
      bgColor: "bg-red-100",
      btnColor: "bg-red-600 hover:bg-red-700",
      defaultBtnText: "Hapus",
      showCancel: true,
    },
    confirm: {
      icon: AlertTriangle, // Atau Info
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      btnColor: "bg-blue-600 hover:bg-blue-700",
      defaultBtnText: "Ya, Lanjutkan",
      showCancel: true,
    },
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100">
        
        {/* Tombol Close Pojok (Opsional) */}
        <div className="absolute top-4 right-4">
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          {/* IKON DINAMIS */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${currentConfig.bgColor} ${currentConfig.color}`}>
            <Icon size={32} />
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {message || description} 
          </p>

          {/* TOMBOL AKSI */}
          <div className="flex gap-3">
            
            {/* Tombol Batal (Hanya muncul jika showCancel = true) */}
            {currentConfig.showCancel && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            )}
            
            {/* Tombol Utama (Konfirmasi/OK) */}
            <button
              onClick={type === 'success' ? onClose : onConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 text-white rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 ${currentConfig.btnColor}`}
            >
              {isLoading ? "Memproses..." : (confirmText || currentConfig.defaultBtnText)}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}