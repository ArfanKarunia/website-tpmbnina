"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Activity, FileText, Clock } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName: string;
}

export default function AncHistoryModal({ isOpen, onClose, patientId, patientName }: ModalProps) {
  const supabase = createClient();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patientId) {
      const fetchHistory = async () => {
        setLoading(true);
        // Ambil data rekam medis milik pasien ini, urutkan dari yang terbaru
        const { data, error } = await supabase
          .from("medical_records")
          .select("*")
          .eq("patient_id", patientId)
          .order("visit_date", { ascending: false });

        if (!error && data) {
            setHistory(data);
        }
        setLoading(false);
      };
      fetchHistory();
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-pink-600 text-white rounded-t-2xl shrink-0">
          <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Activity size={20} /> Riwayat Pemeriksaan
              </h3>
              <p className="text-pink-100 text-xs mt-0.5">Pasien: {patientName}</p>
          </div>
          <button onClick={onClose} className="hover:bg-pink-700 p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {loading ? (
                <div className="text-center py-10 text-gray-400">Memuat data...</div>
            ) : history.length > 0 ? (
                <div className="space-y-6">
                    {history.map((record) => (
                        <div key={record.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative pl-6">
                            {/* Garis Timeline Dekoratif */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-400 rounded-l-xl"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 text-gray-600 text-sm font-bold">
                                    <Calendar size={16} className="text-pink-500"/>
                                    {new Date(record.visit_date).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">
                                    Petugas: {record.staff_name}
                                </span>
                            </div>

                            {/* Vital Signs Grid */}
                            <div className="grid grid-cols-4 gap-2 mb-4 bg-gray-50 p-3 rounded-lg text-center">
                                <div><span className="block text-[10px] text-gray-400 uppercase">BB</span><span className="font-bold text-gray-700 text-sm">{record.weight} Kg</span></div>
                                <div><span className="block text-[10px] text-gray-400 uppercase">Tensi</span><span className="font-bold text-gray-700 text-sm">{record.blood_pressure}</span></div>
                                <div><span className="block text-[10px] text-gray-400 uppercase">Nadi</span><span className="font-bold text-gray-700 text-sm">{record.heart_rate}</span></div>
                                <div><span className="block text-[10px] text-gray-400 uppercase">Suhu</span><span className="font-bold text-gray-700 text-sm">{record.temperature}°C</span></div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Diagnosa & Catatan</h5>
                                    <p className="text-sm text-gray-800 font-medium">{record.diagnosis}</p>
                                    <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-yellow-50 p-2 rounded border border-yellow-100">
                                        {record.action || "Tidak ada catatan tindakan."}
                                    </div>
                                </div>
                                
                                {record.therapy && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Terapi / Obat:</span>
                                        <p className="text-sm text-gray-700 italic">{record.therapy}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Clock size={48} className="mb-4 opacity-20"/>
                    <p>Belum ada riwayat pemeriksaan untuk pasien ini.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}