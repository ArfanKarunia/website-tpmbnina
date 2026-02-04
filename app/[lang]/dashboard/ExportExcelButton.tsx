"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

// Sesuaikan interface ini dengan yang ada di PelayananPage
interface MedicalRecord {
  id: string;
  visit_date: string;
  patient_name: string;
  patient_address: string;
  patient_age: string; // Format contoh: "25 TH", "10 BLN"
  diagnosis: string;
  action: string;
  therapy: string;
  total_price: number;
  weight: number;
  blood_pressure: string;
  temperature: number;
  oxygen_saturation: number;
  heart_rate: number;
  staff_name: string;
  medicine_cost: number;
  service_fee: number;
  risk_level?: string;
}

interface ExportProps {
  records: MedicalRecord[];
}

export default function ExportExcelButton({ records }: ExportProps) {

  // --- 1. LOGIKA PEMISAH KATEGORI (THE "DETECTIVE") ---
  const getCategory = (rec: MedicalRecord) => {
    const ageStr = rec.patient_age || "";
    const diagUpper = (rec.diagnosis || "").toUpperCase();
    const actionUpper = (rec.action || "").toUpperCase();
    const combinedText = diagUpper + " " + actionUpper;

    // A. Cek Bayi/Balita (Prioritas Utama)
    // Logika: Jika mengandung "BLN" atau "HARI", PASTI anak. 
    // Jika "TH", cek angkanya.
    if (ageStr.toUpperCase().includes("BLN") || ageStr.toUpperCase().includes("HARI")) {
      return "KIA"; 
    }
    if (ageStr.toUpperCase().includes("TH")) {
      const ageNum = parseInt(ageStr.replace(/[^0-9]/g, ''));
      if (ageNum < 7) return "KIA"; // Balita/Anak
    }

    // B. Cek Layanan Ibu & Anak (ANC, KB, Nifas)
    // Kata kunci untuk memaksa masuk sheet KIA meskipun dewasa
    const kiaKeywords = [
      "HAMIL", "ANC", "BUMIL", "G1", "G2", "G3", "G4", "G5", // Kehamilan
      "KB", "SUNTIK", "PIL", "IUD", "IMPLANT", "SUSUK", "DEPO", "CYCLO", // KB
      "NIFAS", "PNC", "KF1", "KF2", "KF3", "KF4", // Nifas
      "IMUNISASI", "BCG", "CAMPAK", "POLIO", "PENTABIO", "DPT" // Imunisasi
    ];

    if (kiaKeywords.some(key => combinedText.includes(key))) {
      return "KIA";
    }

    // C. Sisanya masuk BP (Umum)
    return "BP";
  };

  // --- 2. FORMAT DATA UNTUK EXCEL ---
  const handleExport = () => {
    // A. Siapkan Wadah Data
    // Kita pakai struktur Array of Arrays agar bisa bikin Header Bertingkat (Terutama KIA)
    
    // Header KIA (Baris 1 & 2)
    const kiaHeader1 = [
      "TGL", "NO", "NAMA", "UMUR", "ALAMAT", "RT", "RW", "BB", "S", "DIAGNOSA", "TERAPI", 
      "BAYI", "BALITA", "ANC", "", "", "", "KET", "", "INC", "PNC", "", "", "", 
      "KB", "", "", "", "", "", "B", "L", "TARIF", "RINCIAN OBAT", "PETUGAS", "UMUM", "BPJS", "BKKBN"
    ];
    const kiaHeader2 = [
      "", "", "", "", "", "", "", "", "", "", "", 
      "0-11 BLN", "12 BLN- 5 TH", "K1", "K2", "K3", "K4", "RR", "RT", "", "KF1", "KF2", "KF3", "KF4",
      "1 BLN", "3 BL", "2BL", "PIL", "IUD", "IMPLANT", "", "", "", "", "", "", "", ""
    ];

    // Header BP (Simple)
    const bpHeader = [
      "TGL", "NO", "NAMA", "UMUR", "ALAMAT", "RT", "RW", "DIAGNOSA", "BB", "TD", 
      "N", "S", "SPO", "TINDAKAN", "TERAPI", "TARIF", "RINCIAN OBAT", "PETUGAS"
    ];

    const kiaData: any[][] = [kiaHeader1, kiaHeader2];
    const bpData: any[][] = [bpHeader];

    // B. Loop Semua Data & Mapping
    let noKia = 1;
    let noBp = 1;

    records.forEach((rec) => {
      const category = getCategory(rec);
      const dateFormatted = new Date(rec.visit_date).toLocaleDateString("id-ID");
      
      // Parse RT/RW sederhana (Cari pola "RT 01" atau "RW 02" di alamat)
      // Kalau mau simpel, kosongkan saja atau isi manual nanti
      const rt = ""; 
      const rw = ""; 

      if (category === "KIA") {
        // --- MAPPING DATA KIA ---
        
        // Logika Centang (Isi angka "1" di kolom yang sesuai)
        const ageStr = (rec.patient_age || "").toUpperCase();
        const diag = (rec.diagnosis || "").toUpperCase();
        const act = (rec.action || "").toUpperCase();
        const combined = diag + " " + act;

        // Kategori Umur
        const isBayi = ageStr.includes("BLN") || ageStr.includes("HARI"); // Asumsi kasar
        const isBalita = !isBayi && ageStr.includes("TH") && parseInt(ageStr) < 7;

        // Deteksi ANC/PNC/KB dari teks diagnosa
        const isK1 = combined.includes("K1");
        const isK2 = combined.includes("K2");
        const isK3 = combined.includes("K3");
        const isK4 = combined.includes("K4");
        
        const isRR = rec.risk_level === "RR";
        const isRT = rec.risk_level === "RT" || rec.risk_level === "RST"; // RST kita anggap RT+ di laporan

        const isKF1 = combined.includes("KF1");
        const isKF2 = combined.includes("KF2");
        const isKF3 = combined.includes("KF3");
        const isKF4 = combined.includes("KF4");

        const isKB1Bln = combined.includes("1 BLN") || combined.includes("CYCLO");
        const isKB3Bln = combined.includes("3 BLN") || combined.includes("TRICLO") || combined.includes("DEPO");
        const isPil = combined.includes("PIL");
        const isIud = combined.includes("IUD");
        const isImplant = combined.includes("IMPLANT");

        const row = [
          dateFormatted,
          noKia++,
          rec.patient_name,
          rec.patient_age,
          rec.patient_address,
          rt, rw,
          rec.weight || "",
          rec.temperature || "",
          rec.diagnosis,
          rec.therapy,
          isBayi ? "1" : "",      // Bayi
          isBalita ? "1" : "",    // Balita
          isK1 ? "1" : "",        // K1
          isK2 ? "1" : "",        // K2
          isK3 ? "1" : "",        // K3
          isK4 ? "1" : "",        // K4
          isRR ? "1" : "",        // RR
          isRT ? "1" : "",        // RT
          "",                     // Kosong (Kolom gabungan di excel asli)
          isKF1 ? "1" : "",       // KF1
          isKF2 ? "1" : "",       // KF2
          isKF3 ? "1" : "",       // KF3
          isKF4 ? "1" : "",       // KF4
          isKB1Bln ? "1" : "",    // KB 1 Bln
          isKB3Bln ? "1" : "",    // KB 3 Bln
          "",                     // KB 2 Bln (Jarang)
          isPil ? "1" : "",       // Pil
          isIud ? "1" : "",       // IUD
          isImplant ? "1" : "",   // Implant
          "1",                    // B (Baru) - Default 1 dulu
          "",                     // L (Lama)
          rec.total_price,
          rec.medicine_cost,      // Rincian Obat (Harga Modal/Jual Obat)
          rec.staff_name,
          "1",                    // Umum (Default)
          "",                     // BPJS
          ""                      // BKKBN
        ];
        kiaData.push(row);

      } else {
        // --- MAPPING DATA BP ---
        const row = [
          dateFormatted,
          noBp++,
          rec.patient_name,
          rec.patient_age,
          rec.patient_address,
          rt, rw,
          rec.diagnosis,
          rec.weight || "",
          rec.blood_pressure || "",
          rec.heart_rate || "",
          rec.temperature || "",
          rec.oxygen_saturation || "",
          rec.action,
          rec.therapy,
          rec.total_price,
          rec.medicine_cost,
          rec.staff_name
        ];
        bpData.push(row);
      }
    });

    // C. Buat File Excel
    const wb = XLSX.utils.book_new();

    // Sheet 1: KIA
    const wsKia = XLSX.utils.aoa_to_sheet(kiaData);
    
    // Merge Header KIA (Contoh: ANC K1-K4) - Opsional, bikin cantik
    // !merges mengharapkan object {s: {r, c}, e: {r, c}} -> Start/End Row/Col
    wsKia['!merges'] = [
      { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } }, // Merge Header BAYI-BALITA (diatasnya kosong sebenernya di CSV mu)
      { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } }, // Merge ANC (K1-K4)
      { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } }, // Merge KET (RR-RT)
      { s: { r: 0, c: 20 }, e: { r: 0, c: 23 } }, // Merge PNC (KF1-KF4)
      { s: { r: 0, c: 24 }, e: { r: 0, c: 29 } }, // Merge KB
    ];
    XLSX.utils.book_append_sheet(wb, wsKia, "KIA");

    // Sheet 2: PASIEN BP
    const wsBp = XLSX.utils.aoa_to_sheet(bpData);
    XLSX.utils.book_append_sheet(wb, wsBp, "PASIEN BP");

    // D. Download
    XLSX.writeFile(wb, `Laporan_Pelayanan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm"
    >
      <Download size={18} /> Export Excel
    </button>
  );
}