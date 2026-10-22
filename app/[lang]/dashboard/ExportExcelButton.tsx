"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/app/utils/supabase/client";

// Sesuaikan interface ini dengan yang ada di PelayananPage
interface MedicalRecord {
  id: string;
  patient_id?: string;
  visit_date: string;
  patient_name: string;
  patient_address: string;
  patient_age: string; 
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
  created_at?: string;
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
  const handleExport = async () => {
    const supabase = createClient();
    
    // Kumpulkan patient_id unik untuk mengambil detail pasien
    const patientIds = Array.from(
      new Set(records.map((r) => r.patient_id).filter((id): id is string => Boolean(id)))
    );

    interface PatientInfo {
      id: string;
      nik?: string;
      husband_name?: string;
      birth_date?: string;
      type?: string;
    }

    const patientMap = new Map<string, PatientInfo>();

    if (patientIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, nik, husband_name, birth_date, type")
          .in("id", patientIds);

        if (data && !error) {
          data.forEach((p) => {
            patientMap.set(p.id, p);
          });
        }
      } catch (err) {
        console.error("Gagal mengambil data pasien untuk register KB:", err);
      }
    }

    // A. Siapkan Wadah Data
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

    // B. Urutkan Data secara Kronologis (Terlama ke Terbaru) & Mapping
    const sortedRecords = [...records].sort((a, b) => {
      const dateDiff = new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
      if (dateDiff !== 0) return dateDiff;

      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    // Kop & Header REGISTER KB
    const earliestDate = sortedRecords.length > 0 ? new Date(sortedRecords[0].visit_date) : new Date();
    const bulanTahun = !isNaN(earliestDate.getTime())
      ? earliestDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase()
      : new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();

    const kbKop1 = ["REGISTER KB"];
    const kbKop2 = [`BULAN ${bulanTahun}`];
    const kbKop3 = ["TPMB NINA RAHAYU"];
    const kbKop4: any[] = [];

    const kbHeader1 = [
      "TGL", "NO", "NAMA IBU", "NAMA SUAMI", "NIK", "TTL / UMUR", "ALAMAT", 
      "JENIS KB", "", "", "", "", "", "", 
      "JUMLAH ANAK", "UMUM", "BPJS", "BKKBN", "KET"
    ];
    const kbHeader2 = [
      "", "", "", "", "", "", "", 
      "PIL", "3 BLN", "2 BLN", "1 BLN", "IUD", "IMPLANT", "KONDOM", 
      "", "", "", "", ""
    ];

    const kbData: any[][] = [kbKop1, kbKop2, kbKop3, kbKop4, kbHeader1, kbHeader2];

    let noKia = 1;
    let noBp = 1;

    let currentKbDate = "";
    let noKb = 1;

    sortedRecords.forEach((rec) => {
      const category = getCategory(rec);
      const dateFormatted = new Date(rec.visit_date).toLocaleDateString("id-ID");
      
      // Parse RT/RW sederhana (Cari pola "RT 01" atau "RW 02" di alamat)
      const rt = ""; 
      const rw = ""; 

      if (category === "KIA") {
        // --- MAPPING DATA KIA ---
        const ageStr = (rec.patient_age || "").toUpperCase();
        const diag = (rec.diagnosis || "").toUpperCase();
        const act = (rec.action || "").toUpperCase();
        const combined = diag + " " + act;

        // Kategori Umur
        const isBayi = ageStr.includes("BLN") || ageStr.includes("HARI");
        const isBalita = !isBayi && ageStr.includes("TH") && parseInt(ageStr) < 7;

        // Deteksi ANC/PNC/KB dari teks diagnosa
        const isK1 = combined.includes("K1");
        const isK2 = combined.includes("K2");
        const isK3 = combined.includes("K3");
        const isK4 = combined.includes("K4");
        
        const isRR = rec.risk_level === "RR";
        const isRT = rec.risk_level === "RT" || rec.risk_level === "RST";

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

        // --- SELEKSI & MAPPING DATA REGISTER KB ---
        const combinedKb = (
          (rec.diagnosis || "") + " " +
          (rec.action || "") + " " +
          (rec.therapy || "")
        ).toUpperCase();

        const isPilKb = combinedKb.includes("PIL");
        const is3BlnKb = combinedKb.includes("3 BLN") || combinedKb.includes("TRICLO") || combinedKb.includes("DEPO");
        const is2BlnKb = combinedKb.includes("2 BLN") || combinedKb.includes("2BL");
        const is1BlnKb = combinedKb.includes("1 BLN") || combinedKb.includes("CYCLO");
        const isIudKb = combinedKb.includes("IUD");
        const isImplantKb = combinedKb.includes("IMPLANT") || combinedKb.includes("SUSUK");
        const isKondomKb = combinedKb.includes("KONDOM");

        const hasKb = isPilKb || is3BlnKb || is2BlnKb || is1BlnKb || isIudKb || isImplantKb || isKondomKb;

        if (hasKb) {
          if (dateFormatted !== currentKbDate) {
            currentKbDate = dateFormatted;
            noKb = 1;
          }

          const patientInfo = rec.patient_id ? patientMap.get(rec.patient_id) : undefined;

          // TTL / UMUR: patient_age; bila kosong, pakai birth_date pasien format id-ID
          let ttlUmur = rec.patient_age || "";
          if (!ttlUmur && patientInfo?.birth_date) {
            const birthDate = new Date(patientInfo.birth_date);
            ttlUmur = !isNaN(birthDate.getTime()) ? birthDate.toLocaleDateString("id-ID") : "";
          }

          // UMUM: bila type pasien "Umum", isi total_price; BPJS: bila type "BPJS", isi "1"; BKKBN: kosong
          let umumVal: any = "";
          let bpjsVal = "";
          if (patientInfo?.type === "Umum") {
            umumVal = rec.total_price;
          } else if (patientInfo?.type === "BPJS") {
            bpjsVal = "1";
          }

          const kbRow = [
            dateFormatted,
            noKb++,
            rec.patient_name,
            patientInfo?.husband_name || "",
            patientInfo?.nik || "",
            ttlUmur,
            rec.patient_address,
            isPilKb ? "1" : "",
            is3BlnKb ? "1" : "",
            is2BlnKb ? "1" : "",
            is1BlnKb ? "1" : "",
            isIudKb ? "1" : "",
            isImplantKb ? "1" : "",
            isKondomKb ? "1" : "",
            "", // JUMLAH ANAK
            umumVal,
            bpjsVal,
            "", // BKKBN
            rec.therapy || "" // KET
          ];

          kbData.push(kbRow);
        }

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
    
    // Merge Header KIA (Contoh: ANC K1-K4)
    wsKia['!merges'] = [
      { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } }, // Merge Header BAYI-BALITA
      { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } }, // Merge ANC (K1-K4)
      { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } }, // Merge KET (RR-RT)
      { s: { r: 0, c: 20 }, e: { r: 0, c: 23 } }, // Merge PNC (KF1-KF4)
      { s: { r: 0, c: 24 }, e: { r: 0, c: 29 } }, // Merge KB
    ];
    XLSX.utils.book_append_sheet(wb, wsKia, "KIA");

    // Sheet 2: PASIEN BP
    const wsBp = XLSX.utils.aoa_to_sheet(bpData);
    XLSX.utils.book_append_sheet(wb, wsBp, "PASIEN BP");

    // Sheet 3: REGISTER KB
    const wsKb = XLSX.utils.aoa_to_sheet(kbData);
    wsKb['!merges'] = [
      { s: { r: 4, c: 7 }, e: { r: 4, c: 13 } }, // Merge Header JENIS KB (PIL hingga KONDOM)
    ];
    XLSX.utils.book_append_sheet(wb, wsKb, "REGISTER KB");

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
