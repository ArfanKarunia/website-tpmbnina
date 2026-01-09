"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { X, Save, Stethoscope, Plus, Trash2, Search, Loader2, UserCheck, UserPlus, History, Baby, HeartPulse, User } from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";

// --- INTERFACES & TYPES ---
interface Patient { 
  id: string; 
  name: string; 
  address: string; 
  birth_date: string; 
  nik?: string;
  hpht?: string;        
  husband_name?: string; 
}

interface Medicine { 
  id: string; 
  name: string; 
  price: number; 
  stock: number; 
}

interface SelectedMedicine {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  patient_id: string;
  patient_name: string;
  diagnosis: string;
  action: string;
  therapy: string;
  staff_name: string;
  weight: number;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  oxygen_saturation: number;
  service_fee: number;
  medicine_cost: number;
  total_price: number;
  risk_level: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: MedicalRecord | null;
}

// --- UTILITY FUNCTIONS (Diluar Component) ---
const calculateAge = (dobString: string) => {
  if (!dobString) return 0;
  const birthday = new Date(dobString);
  const ageDifMs = Date.now() - birthday.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const calculatePregnancy = (hphtDate: string) => {
  if(!hphtDate) return { uk: "", hpl: "" };
  const hpht = new Date(hphtDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - hpht.getTime());
  const weeks = Math.floor(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 7);
  const hplDate = new Date(hpht);
  hplDate.setDate(hplDate.getDate() + 280);
  const hplString = hplDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return { uk: `${weeks} Minggu`, hpl: hplString };
};

// Data Statis untuk Risk Level (Biar codingan rapi)
const RISK_LEVELS = [
  { value: 'RR', label: 'RR', desc: 'Resiko Rendah', color: 'green' },
  { value: 'RT', label: 'RT', desc: 'Resiko Tinggi', color: 'yellow' },
  { value: 'RST', label: 'RST', desc: 'Resiko Sangat Tinggi', color: 'red' },
];

export default function AddMedicalRecordModal({ isOpen, onClose, recordToEdit }: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Search & Patient State
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [visitCount, setVisitCount] = useState<number>(0); 
  const [isOldPatient, setIsOldPatient] = useState(false);

  // ANC State
  const [isAncMode, setIsAncMode] = useState(false);
  const [ancData, setAncData] = useState({
      husband_name: "", hpht: "", gravida: "", usg_type: "2D",
      leopold1: "", leopold2: "", leopold3: "", leopold4: "", djj: "",
  });
  const [calcResult, setCalcResult] = useState({ uk: "", hpl: "" });

  // Medicine State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);
  const [oldMedicineTrack, setOldMedicineTrack] = useState<{name: string, qty: number}[]>([]);

  // Main Form State
  const [formData, setFormData] = useState({
    patient_id: "",
    visit_date: new Date().toISOString().split('T')[0],
    diagnosis: "",
    action: "",
    staff_name: "Bidan Nina",
    weight: "",
    blood_pressure: "",
    heart_rate: "",
    temperature: "",
    spo: "",
    service_fee: 0,
    risk_level: "", // State untuk KSPR
  });

  // --- EFFECTS ---

  // Hitung HPL otomatis saat HPHT berubah
  useEffect(() => {
    if(ancData.hpht) {
       setCalcResult(calculatePregnancy(ancData.hpht));
    }
  }, [ancData.hpht]);

  // Init Data saat Modal Buka
  useEffect(() => {
    if (isOpen) {
      const fetchMedicines = async () => {
        const { data } = await supabase.from("medicines").select("*").order("name");
        setMedicines(data || []);
      };
      fetchMedicines();

      if (recordToEdit) {
        // Mode Edit
        setFormData({
            patient_id: recordToEdit.patient_id,
            visit_date: recordToEdit.visit_date,
            diagnosis: recordToEdit.diagnosis.replace(/G\d+\s-\s/, ''), // Hapus prefix G.. jika ada
            action: recordToEdit.action?.split('\n\n[ANC Data]')[0] || "", // Ambil action murni
            staff_name: recordToEdit.staff_name || "Bidan Nina",
            weight: recordToEdit.weight?.toString() || "",
            blood_pressure: recordToEdit.blood_pressure || "",
            heart_rate: recordToEdit.heart_rate?.toString() || "",
            temperature: recordToEdit.temperature?.toString() || "",
            spo: recordToEdit.oxygen_saturation?.toString() || "",
            service_fee: recordToEdit.service_fee,
            risk_level: recordToEdit.risk_level || "",
        });
        
        setPatientQuery(recordToEdit.patient_name || ""); 
        checkPatientHistory(recordToEdit.patient_id); 

        // Deteksi ANC Mode dari diagnosa atau data action
        if(recordToEdit.diagnosis.toLowerCase().includes('hamil') || 
           recordToEdit.diagnosis.toLowerCase().includes('anc') || 
           recordToEdit.action.includes('[ANC Data]')) {
             setIsAncMode(true);
             // TODO: Parsing data ANC string kembali ke state jika diperlukan (Complex regex)
        }

        // Load Obat
        const fetchItems = async () => {
            const { data: items } = await supabase.from('visit_items').select('*, medicines(name)').eq('visit_id', recordToEdit.id);
            if (items && items.length > 0) {
                 const recoveredCart = items.map((i: any) => ({
                     id: i.item_id,
                     name: i.medicines?.name || "Obat",
                     qty: i.qty,
                     price: i.price_at_transaction
                 }));
                 setSelectedMedicines(recoveredCart);
                 setOldMedicineTrack(recoveredCart.map(i => ({ name: i.name, qty: i.qty })));
            }
        };
        fetchItems();

      } else {
        // Mode Baru (Reset)
        setFormData({
           patient_id: "", visit_date: new Date().toISOString().split('T')[0], diagnosis: "", action: "",
           staff_name: "Bidan Nina", weight: "", blood_pressure: "", heart_rate: "", temperature: "", spo: "", service_fee: 0, risk_level: ""
        });
        setAncData({ husband_name: "", hpht: "", gravida: "", usg_type: "2D", leopold1: "", leopold2: "", leopold3: "", leopold4: "", djj: "" });
        setCalcResult({ uk: "", hpl: "" });
        setIsAncMode(false);
        setPatientQuery(""); 
        setSelectedMedicines([]);
        setOldMedicineTrack([]);
        setVisitCount(0);
        setIsOldPatient(false);
      }
    }
  }, [isOpen, recordToEdit]);

  // --- HANDLERS ---

  const checkPatientHistory = async (patientId: string) => {
     const { count } = await supabase.from('medical_records').select('*', { count: 'exact', head: true }).eq('patient_id', patientId);
     setVisitCount(count || 0);
     setIsOldPatient((count || 0) > 0);
  };

  const handleSearchPatient = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setPatientQuery(query);
    setShowPatientDropdown(true);

    if (query === "") {
        setFormData(prev => ({ ...prev, patient_id: "" }));
        setPatientResults([]);
        return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
        setIsSearchingPatient(true);
        const { data } = await supabase.from("patients").select("*").ilike("name", `%${query}%`).limit(10); 
        if (data) setPatientResults(data);
        setIsSearchingPatient(false);
    }, 300);
  };

  const selectPatient = (patient: Patient) => {
      setFormData(prev => ({ ...prev, patient_id: patient.id }));
      setPatientQuery(patient.name);
      setShowPatientDropdown(false);
      checkPatientHistory(patient.id);
      
      setAncData(prev => ({
          ...prev,
          husband_name: patient.husband_name || "",
          hpht: patient.hpht || ""
      }));
  };

  // Medicine Logic
  const addMedicineToCart = (medId: string) => {
    const med = medicines.find(m => m.id === medId);
    if (med) {
      setSelectedMedicines(prev => {
        const existing = prev.find(m => m.id === medId);
        if (existing) {
          return prev.map(m => m.id === medId ? {...m, qty: m.qty + 1} : m);
        }
        return [...prev, { id: med.id, name: med.name, qty: 1, price: med.price }];
      });
    }
  };

  const updateQty = (index: number, newQty: number) => {
      if (isNaN(newQty) || newQty < 1) return;
      setSelectedMedicines(prev => {
        const newCart = [...prev];
        newCart[index].qty = newQty;
        return newCart;
      });
  };

  const removeMedicineFromCart = (index: number) => {
    setSelectedMedicines(prev => prev.filter((_, i) => i !== index));
  };

  // Totals
  const medicineTotal = useMemo(() => selectedMedicines.reduce((acc, item) => acc + (item.price * item.qty), 0), [selectedMedicines]);
  const grandTotal = Number(formData.service_fee) + medicineTotal;

  // SUBMIT LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) return alert("Mohon pilih pasien!");

    setLoading(true);

    try {
      const { data: selectedPatient } = await supabase.from("patients").select("*").eq("id", formData.patient_id).single();
      const therapyString = selectedMedicines.map(m => `${m.name} (${m.qty})`).join(", ");
      const realAge = selectedPatient?.birth_date ? calculateAge(selectedPatient.birth_date) : 0;

      // 1. Update Data Pasien (ANC Info)
      if (isAncMode) {
          await supabase.from("patients").update({
              hpht: ancData.hpht || null,
              husband_name: ancData.husband_name
          }).eq("id", formData.patient_id);
      }

      // 2. Prepare Payload
      let finalDiagnosis = formData.diagnosis;
      let finalAction = formData.action;

      if (isAncMode) {
          finalDiagnosis = `G${ancData.gravida} - ${formData.diagnosis}`; 
          const ancDetails = `\n\n[ANC Data]\nSuami: ${ancData.husband_name}\nUSG: ${ancData.usg_type}\nDJJ: ${ancData.djj}\nLeo 1-4: ${ancData.leopold1}/${ancData.leopold2}/${ancData.leopold3}/${ancData.leopold4}`;
          finalAction = `${formData.action}${ancDetails}`;
      }

      const payload = {
        visit_date: formData.visit_date,
        patient_id: formData.patient_id,
        patient_name: selectedPatient?.name,
        patient_address: selectedPatient?.address,
        patient_age: realAge + " TH",
        
        weight: parseFloat(formData.weight) || 0,
        blood_pressure: formData.blood_pressure,
        heart_rate: parseInt(formData.heart_rate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        oxygen_saturation: parseFloat(formData.spo) || 0,

        diagnosis: finalDiagnosis,
        action: finalAction,
        therapy: therapyString,
        staff_name: formData.staff_name,
        risk_level: formData.risk_level, // Save KSPR

        medicine_cost: medicineTotal,
        service_fee: formData.service_fee,
        total_price: grandTotal
      };

      let recordId = recordToEdit?.id;

      if (recordToEdit) {
         // --- LOGIKA EDIT ---
         // Kembalikan stok obat lama dulu
         const { data: oldItems } = await supabase.from('visit_items').select('*').eq('visit_id', recordId);
         if (oldItems) {
             for (const item of oldItems) {
                 const { data: med } = await supabase.from('medicines').select('stock').eq('id', item.item_id).single();
                 if (med) await supabase.from('medicines').update({ stock: med.stock + item.qty }).eq('id', item.item_id);
             }
             await supabase.from('visit_items').delete().eq('visit_id', recordId);
         }
         
         await supabase.from("medical_records").update(payload).eq("id", recordToEdit.id);
         
         // Update Transaksi
         await supabase.from("transactions").update({ amount: formData.service_fee }).eq("date", recordToEdit.visit_date).eq("category", "Layanan Medis").ilike("description", `%${recordToEdit.patient_name}%`);
         await supabase.from("transactions").update({ amount: medicineTotal }).eq("date", recordToEdit.visit_date).eq("category", "Obat & Vitamin").ilike("description", `%${recordToEdit.patient_name}%`);

      } else {
         // --- LOGIKA INSERT BARU ---
         const { data: newRec, error } = await supabase.from("medical_records").insert([payload]).select().single();
         if (error) throw error;
         recordId = newRec.id;

         // Insert Transaksi
         const transactionsPayload = [];
         if (formData.service_fee > 0) {
             transactionsPayload.push({
                date: formData.visit_date, description: `Jasa: ${selectedPatient?.name} (${isAncMode ? 'ANC' : 'Umum'})`,
                category: "Layanan Medis", type: "in", amount: formData.service_fee, quantity: 1
             });
         }
         if (medicineTotal > 0) {
             transactionsPayload.push({
                date: formData.visit_date, description: `Obat: ${selectedPatient?.name}`,
                category: "Obat & Vitamin", type: "in", amount: medicineTotal, quantity: 1
             });
         }
         if (transactionsPayload.length > 0) {
            await supabase.from("transactions").insert(transactionsPayload);
         }
      }

      // 3. Insert Obat Baru & Kurangi Stok
      if (selectedMedicines.length > 0 && recordId) {
          const itemsPayload = selectedMedicines.map(m => ({
              visit_id: recordId, item_id: m.id, qty: m.qty,
              price_at_transaction: m.price, subtotal: m.qty * m.price
          }));
          await supabase.from('visit_items').insert(itemsPayload);

          for (const item of selectedMedicines) {
              const medData = medicines.find(m => m.id === item.id);
              if (medData) await supabase.from("medicines").update({ stock: medData.stock - item.qty }).eq("id", item.id);
          }
      }

      setShowSuccess(true);
    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            {/* 1. HEADER */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white rounded-t-2xl shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Stethoscope size={20}/> {recordToEdit ? "Edit Rekam Medis" : "Input Pelayanan Baru"}</h3>
              <button onClick={onClose}><X size={20} className="hover:text-red-200" /></button>
            </div>

            {/* 2. CONTENT */}
            <div className="overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* SEARCH PASIEN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Cari Pasien</label>
                            {formData.patient_id && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isOldPatient ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isOldPatient ? <UserCheck size={10}/> : <UserPlus size={10}/>}
                                    {isOldPatient ? `Pasien Lama (Ke-${visitCount})` : "Pasien Baru"}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <input type="text" required placeholder="Ketik nama pasien..." className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={patientQuery} onChange={handleSearchPatient} onFocus={() => setShowPatientDropdown(true)} />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            {isSearchingPatient && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />}
                        </div>
                        {showPatientDropdown && patientQuery.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {patientResults.map((p) => (
                                    <div key={p.id} onClick={() => selectPatient(p)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                                        <p className="text-sm font-bold text-gray-800">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.address} • {p.birth_date ? calculateAge(p.birth_date) : "-"} Th</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Tanggal</label><input type="date" required className="w-full p-2 border rounded-xl" value={formData.visit_date} onChange={(e) => setFormData({...formData, visit_date: e.target.value})} /></div>
                  </div>

                  {/* TANDA VITAL */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Tanda Vital</h4>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        <div><label className="text-[10px] uppercase text-gray-400">BB (Kg)</label><input type="number" step="0.1" className="w-full p-2 border rounded-lg text-sm" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} /></div>
                        <div><label className="text-[10px] uppercase text-gray-400">Tensi</label><input type="text" className="w-full p-2 border rounded-lg text-sm" value={formData.blood_pressure} onChange={(e) => setFormData({...formData, blood_pressure: e.target.value})} /></div>
                        <div><label className="text-[10px] uppercase text-gray-400">Nadi</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={formData.heart_rate} onChange={(e) => setFormData({...formData, heart_rate: e.target.value})} /></div>
                        <div><label className="text-[10px] uppercase text-gray-400">Suhu (C)</label><input type="number" step="0.1" className="w-full p-2 border rounded-lg text-sm" value={formData.temperature} onChange={(e) => setFormData({...formData, temperature: e.target.value})} /></div>
                        <div><label className="text-[10px] uppercase text-gray-400">SPO2 (%)</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={formData.spo} onChange={(e) => setFormData({...formData, spo: e.target.value})} /></div>
                    </div>
                  </div>

                  {/* TOGGLE PEMERIKSAAN HAMIL (ANC) */}
                  <div className="border border-pink-200 bg-pink-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsAncMode(!isAncMode)}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isAncMode ? 'bg-pink-500 border-pink-500' : 'bg-white border-gray-300'}`}>
                              {isAncMode && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                          <h4 className="text-sm font-bold text-pink-700 flex items-center gap-2">
                              <Baby size={16}/> Pemeriksaan Kehamilan / ANC / USG
                          </h4>
                      </div>

                      {isAncMode && (
                          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase mb-1">HPHT (Penting!)</label>
                                      <input type="date" className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-pink-500" value={ancData.hpht} onChange={(e) => setAncData({...ancData, hpht: e.target.value})} />
                                      {calcResult.uk && (<p className="text-xs text-pink-600 mt-1 font-bold">UK: {calcResult.uk} • HPL: {calcResult.hpl}</p>)}
                                  </div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Nama Suami</label><input type="text" className="w-full p-2 border rounded-xl" value={ancData.husband_name} onChange={(e) => setAncData({...ancData, husband_name: e.target.value})} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Kehamilan Ke (G)</label><input type="text" placeholder="Contoh: G2P1A0" className="w-full p-2 border rounded-xl" value={ancData.gravida} onChange={(e) => setAncData({...ancData, gravida: e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Jenis USG</label><select className="w-full p-2 border rounded-xl bg-white" value={ancData.usg_type} onChange={(e) => setAncData({...ancData, usg_type: e.target.value})}><option value="2D">USG 2D</option><option value="3D">USG 3D</option><option value="4D">USG 4D</option><option value="Transvaginal">Transvaginal</option></select></div>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-pink-100">
                                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><HeartPulse size={12}/> Pemeriksaan Fisik (Leopold & DJJ)</label>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                      <input placeholder="Leopold 1" className="p-2 border rounded" value={ancData.leopold1} onChange={(e) => setAncData({...ancData, leopold1: e.target.value})} />
                                      <input placeholder="Leopold 2" className="p-2 border rounded" value={ancData.leopold2} onChange={(e) => setAncData({...ancData, leopold2: e.target.value})} />
                                      <input placeholder="Leopold 3" className="p-2 border rounded" value={ancData.leopold3} onChange={(e) => setAncData({...ancData, leopold3: e.target.value})} />
                                      <input placeholder="Leopold 4" className="p-2 border rounded" value={ancData.leopold4} onChange={(e) => setAncData({...ancData, leopold4: e.target.value})} />
                                      <div className="col-span-2"><input placeholder="DJJ (Denyut Jantung Janin)" className="w-full p-2 border rounded" value={ancData.djj} onChange={(e) => setAncData({...ancData, djj: e.target.value})} /></div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* KSPR / RISK LEVEL (VERSI OPTIMASI - MAP) */}
                  <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                      <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        ⚠️ Klasifikasi Status Resiko (KSPR)
                        <span className="text-xs font-normal text-gray-400">(Pilih salah satu)</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        {RISK_LEVELS.map((level) => (
                           <label key={level.value} className={`
                              flex-1 flex items-center p-3 border rounded-lg cursor-pointer transition-all
                              ${formData.risk_level === level.value 
                                ? `bg-${level.color}-50 border-${level.color}-500 ring-1 ring-${level.color}-500` 
                                : 'hover:bg-gray-50 border-gray-200'}
                            `}>
                              <input
                                type="radio"
                                name="risk_level"
                                value={level.value}
                                checked={formData.risk_level === level.value}
                                onChange={(e) => setFormData(prev => ({ ...prev, risk_level: e.target.value }))}
                                className={`w-4 h-4 text-${level.color}-600 focus:ring-${level.color}-500 border-gray-300`}
                              />
                              <div className="ml-3">
                                <span className="block text-sm font-bold text-gray-800">{level.label}</span>
                                <span className="block text-xs text-gray-500">{level.desc}</span>
                              </div>
                           </label>
                        ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Diagnosa</label><input type="text" required className="w-full p-2 border rounded-xl" value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1">Tindakan</label><input type="text" className="w-full p-2 border rounded-xl" value={formData.action} onChange={(e) => setFormData({...formData, action: e.target.value})} /></div>
                  </div>

                  {/* OBAT */}
                  <div className="border border-blue-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2"><Plus size={16}/> Resep Obat</h4>
                        {recordToEdit && oldMedicineTrack.length > 0 && (<div className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1"><History size={10} /> <span>Sebelumnya: {oldMedicineTrack.map(o => `${o.name} (${o.qty})`).join(", ")}</span></div>)}
                    </div>
                    <div className="flex gap-2 mb-3">
                        <select className="flex-1 p-2 border rounded-lg text-sm" onChange={(e) => { if (e.target.value) { addMedicineToCart(e.target.value); e.target.value = ""; } }}>
                          <option value="">+ Tambah Obat</option>
                          {medicines.map(m => (<option key={m.id} value={m.id}>{m.name} (Stok: {m.stock}) - Rp {m.price}</option>))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        {selectedMedicines.map((item, idx) => (
                          // FIX: Key menggunakan ID bukan Index
                          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm border border-gray-100">
                              <div className="flex-1"><span className="font-bold text-gray-700">{item.name}</span><div className="text-xs text-gray-500">Harga Satuan: Rp {item.price}</div></div>
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center bg-white border rounded-md"><span className="px-2 text-xs text-gray-400">Qty</span><input type="number" min="1" className="w-12 p-1 text-center font-bold text-blue-600 outline-none border-l" value={item.qty} onChange={(e) => updateQty(idx, parseInt(e.target.value))} /></div>
                                  <span className="font-bold w-20 text-right">Rp {(item.price * item.qty).toLocaleString()}</span>
                                  <button type="button" onClick={() => removeMedicineFromCart(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                              </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* KEUANGAN */}
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-green-800">Biaya Obat (Otomatis)</label><span className="font-mono font-bold text-gray-700">Rp {medicineTotal.toLocaleString("id-ID")}</span></div>
                    <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-green-800">Biaya Jasa</label><input type="number" className="w-32 p-1 border rounded text-right font-mono text-sm" value={formData.service_fee} onChange={(e) => setFormData({...formData, service_fee: parseInt(e.target.value) || 0})} /></div>
                    <div className="border-t border-green-200 pt-2 flex justify-between items-center mt-2"><label className="text-lg font-bold text-green-900">TOTAL</label><span className="text-xl font-bold text-green-700">Rp {grandTotal.toLocaleString("id-ID")}</span></div>
                  </div>

                  {/* INPUT PETUGAS & TOMBOL */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="w-1/3">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Petugas</label>
                        <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" required className="w-full pl-9 p-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.staff_name} onChange={(e) => setFormData({...formData, staff_name: e.target.value})} /></div>
                    </div>
                    <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 mt-5">
                        {loading ? "Menyimpan..." : <><Save size={18} /> {recordToEdit ? "Simpan Perubahan" : "Simpan Data"}</>}
                    </button>
                  </div>

                </form>
            </div>

          </div>
        </div>
      )}
      <ActionModal isOpen={showSuccess} onClose={handleSuccessClose} type="success" title="Berhasil!" message={recordToEdit ? "Data diperbarui. Stok obat dikoreksi & Keuangan disinkronkan." : "Pelayanan berhasil disimpan."} />
    </>
  );
}