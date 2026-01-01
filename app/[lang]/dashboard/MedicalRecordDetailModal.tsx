"use client";

import { X, User, Activity, FileText, Calendar, DollarSign, Thermometer, Heart, UserCheck } from "lucide-react";

interface MedicalRecord {
  id: string;
  visit_date: string;
  patient_name: string;
  patient_address: string;
  patient_age: string;
  
  // Vital Signs
  weight: number;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  oxygen_saturation: number;

  diagnosis: string;
  action: string;
  therapy: string;
  staff_name: string;

  // Finance
  medicine_cost: number;
  service_fee: number;
  total_price: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MedicalRecord | null;
}

export default function MedicalRecordDetailModal({ isOpen, onClose, data }: ModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText size={20} /> Detail Rekam Medis
          </h3>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Info Pasien */}
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
             <div className="w-12 h-12 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold">
                {data.patient_name.charAt(0)}
             </div>
             <div>
                <h4 className="font-bold text-gray-800 text-lg">{data.patient_name}</h4>
                <p className="text-sm text-gray-600">{data.patient_address}</p>
                <div className="flex gap-3 mt-1 text-xs font-mono text-gray-500">
                   <span className="flex items-center gap-1"><User size={12}/> {data.patient_age}</span>
                   <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(data.visit_date).toLocaleDateString("id-ID")}</span>
                </div>
             </div>
          </div>

          {/* Tanda Vital */}
          <div>
             <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2"><Activity size={14}/> Tanda Vital</h5>
             <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="block text-[10px] text-gray-400">Tensi</span>
                   <span className="font-bold text-gray-700">{data.blood_pressure || "-"}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="block text-[10px] text-gray-400">BB (Kg)</span>
                   <span className="font-bold text-gray-700">{data.weight}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="block text-[10px] text-gray-400">Suhu (C)</span>
                   <span className="font-bold text-gray-700">{data.temperature}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="block text-[10px] text-gray-400">Nadi</span>
                   <span className="font-bold text-gray-700">{data.heart_rate}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                   <span className="block text-[10px] text-gray-400">SPO2</span>
                   <span className="font-bold text-gray-700">{data.oxygen_saturation || "-"}%</span>
                </div>
             </div>
          </div>

          {/* Pemeriksaan & Obat */}
          <div className="space-y-3">
             <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase mb-1">Diagnosa</h5>
                <p className="text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">{data.diagnosis}</p>
             </div>
             <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase mb-1">Tindakan</h5>
                <p className="text-sm text-gray-700">{data.action || "-"}</p>
             </div>
             <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase mb-1">Terapi / Obat</h5>
                <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-100 italic">
                   {data.therapy || "Tidak ada obat"}
                </p>
             </div>
          </div>

          {/* Keuangan & Petugas */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
             <div className="flex justify-between text-sm">
                <span className="text-gray-500">Petugas</span>
                <span className="font-medium flex items-center gap-1"><UserCheck size={14}/> {data.staff_name}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-500">Jasa Pelayanan</span>
                <span className="font-mono">Rp {data.service_fee.toLocaleString("id-ID")}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-500">Biaya Obat</span>
                <span className="font-mono">Rp {data.medicine_cost.toLocaleString("id-ID")}</span>
             </div>
             <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl mt-2">
                <span className="font-bold text-green-800 uppercase text-xs">Total Tarif</span>
                <span className="font-bold text-green-700 text-lg">Rp {data.total_price.toLocaleString("id-ID")}</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}