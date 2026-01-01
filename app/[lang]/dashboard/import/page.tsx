"use client";

import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import * as XLSX from "xlsx"; 
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, Terminal } from "lucide-react";

export default function ImportPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentSheet, setCurrentSheet] = useState("");

  // --- HELPER FUNCTIONS ---
  const cleanNumber = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = val.toString().replace(/[^0-9]/g, ""); 
    return parseFloat(cleanStr) || 0;
  };

  const parseDate = (dateVal: any) => {
    if (!dateVal) return new Date().toISOString();
    if (typeof dateVal === 'number') {
        const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return date.toISOString();
    }
    const dateStr = dateVal.toString();
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
         return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString(); 
      }
    }
    return new Date().toISOString();
  };

  const cleanAge = (ageStr: any) => {
    if (!ageStr) return 0;
    const str = ageStr.toString().toUpperCase();
    if (str.includes("BLN") || str.includes("BULAN")) return 0; 
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
  };

  // --- MAIN LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLogs([]);
    setProgress(0);

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });

        let totalSuccess = 0;
        let totalError = 0;

        for (const sheetName of workbook.SheetNames) {
            setCurrentSheet(sheetName); 
            setLogs(prev => [`⏳ Memproses Sheet: ${sheetName}...`, ...prev]);

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); 

            if (jsonData.length === 0) {
                setLogs(prev => [`⚠️ Sheet ${sheetName} kosong, dilewati.`, ...prev]);
                continue;
            }

            const { success, error } = await processBatchData(jsonData);
            totalSuccess += success;
            totalError += error;
            
            setLogs(prev => [`✅ Selesai Sheet ${sheetName}. (Success: ${success})`, ...prev]);
        }

        setLogs(prev => [`🎉 SEMUA SELESAI! Total Masuk: ${totalSuccess}, Gagal: ${totalError}`, ...prev]);

      } catch (err: any) {
        setLogs(prev => [`❌ ERROR FATAL: ${err.message}`, ...prev]);
      } finally {
        setIsLoading(false);
        setCurrentSheet("");
      }
    };

    reader.readAsBinaryString(file);
  };

  const processBatchData = async (rows: any[]) => {
    let successCount = 0;
    let errorCount = 0;
    const total = rows.length;

    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const percent = Math.round(((i + 1) / total) * 100);
      setProgress(percent);

      try {
        if (!row.NAMA) continue;

        const nama = row.NAMA.toString().trim().toUpperCase();
        const alamat = row.ALAMAT ? row.ALAMAT.toString().trim() : "-";
        const tgl = parseDate(row.TGL);
        const umur = cleanAge(row.UMUR);

        let patientId = null;
        
        const { data: existingPatient } = await supabase
          .from("patients")
          .select("id")
          .eq("name", nama)
          .eq("address", alamat)
          .maybeSingle();

        if (existingPatient) {
          patientId = existingPatient.id;
        } else {
          const { data: newPatient, error: errPat } = await supabase
            .from("patients")
            .insert([{
              name: nama,
              address: alamat,
              age: umur,
              created_at: tgl
            }])
            .select("id")
            .single();
          
          if (errPat) throw new Error(`Gagal buat pasien: ${errPat.message}`);
          patientId = newPatient.id;
        }

        const tarif = cleanNumber(row.TARIF);
        const modalObat = cleanNumber(row['RINCIAN OBAT'] || row.HPP); 
        const jasa = tarif - modalObat;

        const { error: errMed } = await supabase.from("medical_records").insert([{
          visit_date: tgl,
          patient_id: patientId,
          patient_name: nama,
          patient_address: alamat,
          patient_age: row.UMUR?.toString() || "",
          diagnosis: row.DIAGNOSA?.toString() || "",
          action: row.TINDAKAN?.toString() || "",
          therapy: row.TERAPI?.toString() || "", 
          weight: cleanNumber(row.BB),
          blood_pressure: row.TD?.toString() || "",
          heart_rate: cleanNumber(row.N),
          temperature: cleanNumber(row.S),
          oxygen_saturation: cleanNumber(row.SPO),
          staff_name: row.PETUGAS?.toString() || "Admin Import",
          total_price: tarif,
          medicine_cost: modalObat,
          service_fee: jasa
        }]);

        if (errMed) throw new Error(`Gagal simpan medis: ${errMed.message}`);

        if (tarif > 0) {
            await supabase.from("transactions").insert([{
                date: tgl,
                description: `Layanan: ${nama} (${row.DIAGNOSA || '-'})`,
                category: "Layanan Medis",
                type: "in",
                amount: tarif,
                quantity: 1
            }]);
        }

        successCount++;

      } catch (err: any) {
        errorCount++;
      }
    }

    return { success: successCount, error: errorCount };
  };

  return (
    // FIX LAYOUT: Gunakan w-full dan hapus max-w-4xl agar memenuhi layar
    <div className="w-full px-6 py-6 space-y-6"> 
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Import Data Excel (.xlsx)</h1>
        <p className="text-gray-500 text-sm">
          Sistem akan membaca semua Sheet (Juni, Juli, Agustus, dll) secara otomatis.
        </p>
      </div>

      {/* UPLOAD BOX - Dibuat Responsive Lebar */}
      <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors text-center w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-blue-600 animate-spin mb-4"/>
              <h3 className="text-lg font-bold text-gray-700">
                {currentSheet ? `Sedang Memproses Sheet: ${currentSheet}` : "Menganalisis File..."}
              </h3>
              <p className="text-gray-400 text-sm mb-2">Proses: {progress}% (Per Sheet)</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 max-w-lg mx-auto">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
        ) : (
          <>
            <FileSpreadsheet size={64} className="text-green-500 mx-auto mb-4" />
            <label htmlFor="fileUpload" className="cursor-pointer">
              <span className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 inline-flex items-center gap-2">
                <UploadCloud size={20}/> Pilih File Excel (.xlsx)
              </span>
              <input 
                id="fileUpload" 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
            <p className="text-gray-400 text-xs mt-4">Pastikan file Excel memiliki Header (TGL, NAMA, dll) di baris pertama setiap Sheet.</p>
          </>
        )}
      </div>

      {/* LOG AREA - Dibuat Lebar dan Tinggi sesuai Layar */}
      {logs.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-6 rounded-2xl font-mono text-xs shadow-xl border border-gray-700 w-full">
           <h4 className="text-white font-bold mb-3 border-b border-gray-700 pb-2 flex items-center gap-2">
              <Terminal size={14}/> Console Logs (Riwayat Proses)
           </h4>
           {/* Scrollable Area */}
           <div className="h-[400px] overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
               {logs.map((log, idx) => (
                 <div key={idx} className={`pb-1 border-b border-gray-800/50 last:border-0 ${log.includes("ERROR") || log.includes("Gagal") ? "text-red-400 font-bold" : log.includes("Sheet") ? "text-yellow-300 font-bold mt-2" : log.includes("SELESAI") ? "text-blue-300 font-bold text-sm py-2" : "opacity-90"}`}>
                    <span className="mr-2 text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                 </div>
               ))}
           </div>
        </div>
      )}
    </div>
  );
}