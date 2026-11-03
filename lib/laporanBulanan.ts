/**
 * lib/laporanBulanan.ts
 * 
 * Modul logika murni (pure functions) untuk fitur Laporan Bulanan One-Click TPMB Nina Rahayu.
 * Tidak mengimpor Supabase maupun komponen UI sehingga dapat diuji secara independen.
 */

// ============================================================================
// Tipe Data & Interface
// ============================================================================

export interface MedicalRecordInput {
  id?: string;
  visit_date?: string | null;
  patient_id?: string | null;
  patient_name?: string | null;
  patient_address?: string | null;
  patient_age?: string | null;
  diagnosis?: string | null;
  action?: string | null;
  therapy?: string | null;
  total_price?: number | null;
  weight?: number | null;
  blood_pressure?: string | null;
  temperature?: number | null;
  oxygen_saturation?: number | null;
  heart_rate?: number | null;
  staff_name?: string | null;
  medicine_cost?: number | null;
  service_fee?: number | null;
  risk_level?: string | null;
  created_at?: string | null;
  height_cm?: number | null;
  lp_cm?: number | null;
  lila_cm?: number | null;
  gds?: number | null;
  tt_status?: string | null;
  jumlah_anak?: number | null;
  anak_terakhir?: string | null;
  [key: string]: any;
}

export interface FilterBulanResult<T = MedicalRecordInput> {
  filteredRecords: T[];
  excludedNullVisitDateCount: number;
}

export type KelompokUmur = "<5TH" | "5-17TH" | "DEWASA-LANSIA" | null;

export type KodePenyakit =
  | "DIARE"
  | "ISPA"
  | "PNEUMONIA"
  | "DENGUE"
  | "TIFOID"
  | "TBC"
  | "HT"
  | "DM"
  | "OBESITAS"
  | "JANTUNG"
  | "STROKE"
  | "PPOK"
  | "KANKER_KOLOREKTAL"
  | "KANKER_LEHER_RAHIM"
  | "KANKER_PAYUDARA"
  | "KANKER_PARU"
  | "JIWA"
  | "EPILEPSI"
  | "GX_PENGLIHATAN"
  | "GX_PENDENGARAN"
  | "KUSTA"
  | "KECACINGAN"
  | "CAMPAK"
  | "HEPATITIS_B"
  | "LAINNYA";

export type KbMethodCode =
  | "PIL"
  | "SUNTIK_3_BLN"
  | "SUNTIK_2_BLN"
  | "SUNTIK_1_BLN"
  | "IUD"
  | "IMPLANT"
  | "KONDOM";

export type StatusKunjunganKb = "BARU" | "LAMA";

export interface UmumBpjsResult {
  umum: number | null;
  bpjs: string | null;
}

export interface GpaResult {
  g: number;
  p: number;
  a: number | null;
}

export type SheetType = "HAMIL" | "KB" | "BALITA" | "UMUM";

// ============================================================================
// 1. filterBulan
// ============================================================================
/**
 * Menyaring kunjungan berdasarkan tahun dan bulan (1 = Januari).
 * Kunjungan dengan visit_date null dikeluarkan dari hasil dan dihitung jumlahnya.
 */
export function filterBulan<T extends { visit_date?: string | null }>(
  records: T[],
  tahun: number,
  bulan: number
): FilterBulanResult<T> {
  let excludedNullVisitDateCount = 0;
  const filteredRecords: T[] = [];

  for (const rec of records) {
    if (!rec.visit_date) {
      excludedNullVisitDateCount++;
      continue;
    }

    const parts = rec.visit_date.split("-");
    if (parts.length >= 2) {
      const recYear = parseInt(parts[0], 10);
      const recMonth = parseInt(parts[1], 10);
      if (recYear === tahun && recMonth === bulan) {
        filteredRecords.push(rec);
        continue;
      }
    } else {
      const d = new Date(rec.visit_date);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === tahun && d.getMonth() + 1 === bulan) {
          filteredRecords.push(rec);
        }
      }
    }
  }

  return { filteredRecords, excludedNullVisitDateCount };
}

// ============================================================================
// 2. kelompokUmur
// ============================================================================
/**
 * Mengelompokkan umur pasien dari string umur.
 * Aturan:
 * - Bila ada angka TH: < 5 → "<5TH", 5–17 → "5-17TH", ≥ 18 → "DEWASA-LANSIA".
 * - Bila tidak ada TH tetapi ada BLN atau HARI → "<5TH".
 * - Bila tidak bisa diparse (termasuk "-") → null.
 */
export function kelompokUmur(patientAge: string | null | undefined): KelompokUmur {
  if (!patientAge || typeof patientAge !== "string") return null;
  const upper = patientAge.trim().toUpperCase();
  if (!upper || upper === "-") return null;

  // Cek pola angka tahun, misal "6 TH", "6TH", "6 TH 2 BLN"
  const thMatch = upper.match(/(\d+)\s*TH/);
  if (thMatch) {
    const years = parseInt(thMatch[1], 10);
    if (isNaN(years)) return null;
    if (years < 5) return "<5TH";
    if (years <= 17) return "5-17TH";
    return "DEWASA-LANSIA";
  }

  // Bila tidak ada TH, jika terdapat BLN atau HARI dengan angka
  if (upper.includes("BLN") || upper.includes("HARI")) {
    if (/\d/.test(upper)) {
      return "<5TH";
    }
  }

  return null;
}

// ============================================================================
// 3. normalisasiDiagnosis
// ============================================================================
/**
 * Mengubah diagnosis ke huruf besar dan membuang prefix ANC di depan
 * (pola G ganda + angka + P + angka + A/AB + angka + " - ") bila ada.
 * Contoh: "G2P1A0 - ISPA" → "ISPA", "GG2P1A0 - ISPA" → "ISPA".
 */
export function normalisasiDiagnosis(diagnosis: string | null | undefined): string {
  if (!diagnosis || typeof diagnosis !== "string") return "";
  const upper = diagnosis.trim().toUpperCase();
  // Buang prefix ANC di depan (G+ angka P angka [A/AB angka] - )
  return upper.replace(/^G+\d+\s*P\d+\s*(?:(?:AB?)\d+)?\s*-\s*/i, "").trim();
}

// ============================================================================
// 4. mapPenyakit
// ============================================================================
/**
 * Memetakan teks diagnosis ke satu kode penyakit (kecocokan pertama menang).
 * Kode pendek (HT, DM, DF, TBC, GEA) dicocokkan sebagai kata utuh (word boundary \b).
 */
export function mapPenyakit(diagnosis: string | null | undefined): KodePenyakit {
  const clean = normalisasiDiagnosis(diagnosis);
  if (!clean) return "LAINNYA";

  // 1. DIARE (DIARE, GEA - GEA word boundary)
  if (clean.includes("DIARE") || /\bGEA\b/.test(clean)) {
    return "DIARE";
  }

  // 2. ISPA
  if (clean.includes("ISPA")) {
    return "ISPA";
  }

  // 3. PNEUMONIA
  if (clean.includes("PNEUMONIA")) {
    return "PNEUMONIA";
  }

  // 4. DENGUE (DENGUE, DBD, DF, DHF - DF word boundary)
  if (
    clean.includes("DENGUE") ||
    clean.includes("DBD") ||
    clean.includes("DHF") ||
    /\bDF\b/.test(clean)
  ) {
    return "DENGUE";
  }

  // 5. TIFOID (TIFOID, TIFUS, PARATYPOID, PARATIFOID, PARATIP)
  if (
    clean.includes("TIFOID") ||
    clean.includes("TIFUS") ||
    clean.includes("PARATYPOID") ||
    clean.includes("PARATIFOID") ||
    clean.includes("PARATIP")
  ) {
    return "TIFOID";
  }

  // 6. TBC (TBC, TUBERKULOSIS - TBC word boundary)
  if (clean.includes("TUBERKULOSIS") || /\bTBC\b/.test(clean)) {
    return "TBC";
  }

  // 7. HT (HT, HIPERTENSI - HT word boundary)
  if (clean.includes("HIPERTENSI") || /\bHT\b/.test(clean)) {
    return "HT";
  }

  // 8. DM (DM, DIABETES - DM word boundary)
  if (clean.includes("DIABETES") || /\bDM\b/.test(clean)) {
    return "DM";
  }

  // 9. OBESITAS
  if (clean.includes("OBESITAS")) {
    return "OBESITAS";
  }

  // 10. JANTUNG
  if (clean.includes("JANTUNG")) {
    return "JANTUNG";
  }

  // 11. STROKE
  if (clean.includes("STROKE")) {
    return "STROKE";
  }

  // 12. PPOK (PPOK, COPD)
  if (clean.includes("PPOK") || clean.includes("COPD")) {
    return "PPOK";
  }

  // 13. KANKER_KOLOREKTAL (KANKER + KOLOREKTAL)
  if (clean.includes("KANKER") && clean.includes("KOLOREKTAL")) {
    return "KANKER_KOLOREKTAL";
  }

  // 14. KANKER_LEHER_RAHIM (KANKER + LEHER RAHIM)
  if (clean.includes("KANKER") && clean.includes("LEHER RAHIM")) {
    return "KANKER_LEHER_RAHIM";
  }

  // 15. KANKER_PAYUDARA (KANKER + PAYUDARA)
  if (clean.includes("KANKER") && clean.includes("PAYUDARA")) {
    return "KANKER_PAYUDARA";
  }

  // 16. KANKER_PARU (KANKER + PARU)
  if (clean.includes("KANKER") && clean.includes("PARU")) {
    return "KANKER_PARU";
  }

  // 17. JIWA
  if (clean.includes("JIWA")) {
    return "JIWA";
  }

  // 18. EPILEPSI
  if (clean.includes("EPILEPSI")) {
    return "EPILEPSI";
  }

  // 19. GX_PENGLIHATAN (PENGLIHATAN)
  if (clean.includes("PENGLIHATAN")) {
    return "GX_PENGLIHATAN";
  }

  // 20. GX_PENDENGARAN (PENDENGARAN)
  if (clean.includes("PENDENGARAN")) {
    return "GX_PENDENGARAN";
  }

  // 21. KUSTA
  if (clean.includes("KUSTA")) {
    return "KUSTA";
  }

  // 22. KECACINGAN
  if (clean.includes("KECACINGAN")) {
    return "KECACINGAN";
  }

  // 23. CAMPAK
  if (clean.includes("CAMPAK")) {
    return "CAMPAK";
  }

  // 24. HEPATITIS_B
  if (clean.includes("HEPATITIS B")) {
    return "HEPATITIS_B";
  }

  // 25. LAINNYA
  return "LAINNYA";
}

// ============================================================================
// 5. isKbRecord, getKbMethod, tampilJenisKb
// ============================================================================
/**
 * Menyalin persis logika predikat KB dari ExportExcelButton.tsx.
 * Memeriksa gabungan teks diagnosis + action + therapy (uppercase).
 */
export function isKbRecord(
  diagnosis?: string | null,
  action?: string | null,
  therapy?: string | null
): boolean {
  const combinedKb = (
    (diagnosis || "") + " " +
    (action || "") + " " +
    (therapy || "")
  ).toUpperCase();

  const isPilKb = combinedKb.includes("PIL");
  const is3BlnKb =
    combinedKb.includes("3 BLN") ||
    combinedKb.includes("TRICLO") ||
    combinedKb.includes("DEPO");
  const is2BlnKb = combinedKb.includes("2 BLN") || combinedKb.includes("2BL");
  const is1BlnKb =
    combinedKb.includes("1 BLN") || combinedKb.includes("CYCLO");
  const isIudKb = combinedKb.includes("IUD");
  const isImplantKb =
    combinedKb.includes("IMPLANT") || combinedKb.includes("SUSUK");
  const isKondomKb = combinedKb.includes("KONDOM");

  return (
    isPilKb ||
    is3BlnKb ||
    is2BlnKb ||
    is1BlnKb ||
    isIudKb ||
    isImplantKb ||
    isKondomKb
  );
}

/**
 * Mengembalikan kode metode KB pertama yang cocok sesuai urutan prioritas:
 * PIL -> SUNTIK_3_BLN -> SUNTIK_2_BLN -> SUNTIK_1_BLN -> IUD -> IMPLANT -> KONDOM.
 */
export function getKbMethod(
  diagnosis?: string | null,
  action?: string | null,
  therapy?: string | null
): KbMethodCode | null {
  const combinedKb = (
    (diagnosis || "") + " " +
    (action || "") + " " +
    (therapy || "")
  ).toUpperCase();

  if (combinedKb.includes("PIL")) return "PIL";
  if (
    combinedKb.includes("3 BLN") ||
    combinedKb.includes("TRICLO") ||
    combinedKb.includes("DEPO")
  ) {
    return "SUNTIK_3_BLN";
  }
  if (combinedKb.includes("2 BLN") || combinedKb.includes("2BL")) {
    return "SUNTIK_2_BLN";
  }
  if (combinedKb.includes("1 BLN") || combinedKb.includes("CYCLO")) {
    return "SUNTIK_1_BLN";
  }
  if (combinedKb.includes("IUD")) return "IUD";
  if (combinedKb.includes("IMPLANT") || combinedKb.includes("SUSUK")) {
    return "IMPLANT";
  }
  if (combinedKb.includes("KONDOM")) return "KONDOM";

  return null;
}

/**
 * Memformat kode jenis KB untuk tampilan Excel / UI laporan.
 */
export function tampilJenisKb(
  kode: KbMethodCode | string | null | undefined
): string {
  switch (kode) {
    case "PIL":
      return "PIL";
    case "SUNTIK_3_BLN":
      return "SUNTIK 3 BULAN";
    case "SUNTIK_2_BLN":
      return "SUNTIK 2 BULAN";
    case "SUNTIK_1_BLN":
      return "SUNTIK 1 BULAN";
    case "IUD":
      return "IUD";
    case "IMPLANT":
      return "IMPLANT";
    case "KONDOM":
      return "KONDOM";
    default:
      return "-";
  }
}

// ============================================================================
// 6. tentukanBaruLama
// ============================================================================
/**
 * Menentukan status kunjungan KB (BARU vs LAMA).
 * riwayatKbPasienTerurut = seluruh rekam KB pasien terurut kronologis menaik.
 * Bila kunjungan ini adalah rekam pertama → "BARU", selain itu "LAMA".
 */
export function tentukanBaruLama(
  riwayatKbPasienTerurut: Array<{ id?: string } | string>,
  idKunjunganIni: string
): StatusKunjunganKb {
  if (!riwayatKbPasienTerurut || riwayatKbPasienTerurut.length === 0) {
    return "BARU";
  }
  const firstItem = riwayatKbPasienTerurut[0];
  const firstId = typeof firstItem === "string" ? firstItem : firstItem?.id;
  if (firstId === idKunjunganIni) {
    return "BARU";
  }
  return "LAMA";
}

// ============================================================================
// 7. getUmumBpjs
// ============================================================================
/**
 * Normalisasi tipe pasien dan alokasi nilai UMUM vs BPJS:
 * - "UMUM" → { umum: totalPrice, bpjs: null }
 * - "BPJS" → { umum: null, bpjs: "1" }
 * - Selain itu → keduanya null.
 */
export function getUmumBpjs(
  tipePasien: string | null | undefined,
  totalPrice: number | null | undefined
): UmumBpjsResult {
  if (!tipePasien || typeof tipePasien !== "string") {
    return { umum: null, bpjs: null };
  }
  const normalized = tipePasien.trim().toUpperCase();
  if (normalized === "UMUM") {
    return { umum: totalPrice ?? null, bpjs: null };
  }
  if (normalized === "BPJS") {
    return { umum: null, bpjs: "1" };
  }
  return { umum: null, bpjs: null };
}

// ============================================================================
// 8. hitungTP (Taksiran Persalinan / Naegele)
// ============================================================================
/**
 * Menghitung Taksiran Persalinan (TP/HPL) dengan rumus Naegele:
 * Bila bulan HPHT <= 2 (Jan–Mar): bulan + 9, tahun sama, tanggal + 7.
 * Bila bulan HPHT > 2 (Apr–Des): bulan - 3, tahun + 1, tanggal + 7.
 * Mengembalikan "YYYY-MM-DD" atau null bila hpht tidak valid/kosong.
 */
export function hitungTP(hpht: string | null | undefined): string | null {
  if (!hpht || typeof hpht !== "string") return null;
  const trimmed = hpht.trim();
  if (!trimmed) return null;

  let y: number, m: number, d: number;
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1; // 0-based month
    d = parseInt(parts[2], 10);
  } else {
    const parsedDate = new Date(trimmed);
    if (isNaN(parsedDate.getTime())) return null;
    y = parsedDate.getFullYear();
    m = parsedDate.getMonth();
    d = parsedDate.getDate();
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const hplDate = new Date(y, m, d);
  if (isNaN(hplDate.getTime())) return null;

  if (hplDate.getMonth() <= 2) {
    hplDate.setMonth(hplDate.getMonth() + 9);
  } else {
    hplDate.setMonth(hplDate.getMonth() - 3);
    hplDate.setFullYear(hplDate.getFullYear() + 1);
  }
  hplDate.setDate(hplDate.getDate() + 7);

  const resYear = hplDate.getFullYear();
  const resMonth = String(hplDate.getMonth() + 1).padStart(2, "0");
  const resDay = String(hplDate.getDate()).padStart(2, "0");

  return `${resYear}-${resMonth}-${resDay}`;
}

// ============================================================================
// 9. parseGpa & formatGpa
// ============================================================================
/**
 * Mengurai prefix Gravida / Para / Abortus dari string diagnosis.
 * Contoh: "G2P1A0 - ..." → { g: 2, p: 1, a: 0 }
 *         "GG2P1A0 - ..." → { g: 2, p: 1, a: 0 }
 *         "G1P0AB0 - ..." → { g: 1, p: 0, a: 0 }
 *         "G - ..." atau tanpa pola → null
 */
export function parseGpa(diagnosis: string | null | undefined): GpaResult | null {
  if (!diagnosis || typeof diagnosis !== "string") return null;
  const upper = diagnosis.trim().toUpperCase();

  // Pola: G berulang di awal, angka G, P, angka P, opsional A/AB + angka A
  const match = upper.match(/^G+([0-9]+)\s*P([0-9]+)(?:\s*(?:A|AB)([0-9]+))?/i);
  if (!match) return null;

  const g = parseInt(match[1], 10);
  const p = parseInt(match[2], 10);
  const a = match[3] !== undefined ? parseInt(match[3], 10) : null;

  if (isNaN(g) || isNaN(p) || (a !== null && isNaN(a))) return null;

  return { g, p, a };
}

/**
 * Memformat hasil parseGpa menjadi representasi teks baku.
 * Bila a ada: "G2P1AB0", bila a null: "G2P1".
 */
export function formatGpa(hasil: GpaResult | null | undefined): string {
  if (!hasil) return "";
  if (hasil.a !== null && hasil.a !== undefined) {
    return `G${hasil.g}P${hasil.p}AB${hasil.a}`;
  }
  return `G${hasil.g}P${hasil.p}`;
}

// ============================================================================
// 10. isAncRecord
// ============================================================================
/**
 * Mengidentifikasi rekam medis ANC/Kehamilan:
 * true bila action mengandung "[ANC Data]" ATAU diagnosis memiliki prefix pola G/P/A.
 */
export function isAncRecord(record: {
  diagnosis?: string | null;
  action?: string | null;
}): boolean {
  if (!record) return false;
  if (record.action && record.action.includes("[ANC Data]")) {
    return true;
  }
  if (record.diagnosis && parseGpa(record.diagnosis) !== null) {
    return true;
  }
  return false;
}

// ============================================================================
// 11. tentukanSheet
// ============================================================================
/**
 * Aturan kategori anak dari ExportExcelButton.tsx:
 * - Mengandung "BLN" atau "HARI" → Anak (Bayi/Balita).
 * - Mengandung "TH" dengan angka < 7 → Anak (Balita/Anak).
 */
export function isBalitaRecord(patientAge?: string | null): boolean {
  if (!patientAge) return false;
  const ageStr = patientAge.toUpperCase();
  if (ageStr.includes("BLN") || ageStr.includes("HARI")) {
    return true;
  }
  if (ageStr.includes("TH")) {
    const cleanNum = ageStr.replace(/[^0-9]/g, "");
    if (cleanNum) {
      const ageNum = parseInt(cleanNum, 10);
      if (!isNaN(ageNum) && ageNum < 7) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Menentukan target sheet laporan dengan prioritas berurutan:
 * 1. HAMIL  (bila isAncRecord)
 * 2. KB     (bila isKbRecord)
 * 3. BALITA (bila aturan kategori anak ExportExcelButton.tsx terpenuhi)
 * 4. UMUM   (selainnya)
 */
export function tentukanSheet(record: {
  diagnosis?: string | null;
  action?: string | null;
  therapy?: string | null;
  patient_age?: string | null;
}): SheetType {
  if (isAncRecord(record)) {
    return "HAMIL";
  }
  if (isKbRecord(record.diagnosis, record.action, record.therapy)) {
    return "KB";
  }
  if (isBalitaRecord(record.patient_age)) {
    return "BALITA";
  }
  return "UMUM";
}

// ============================================================================
// 12. mapRisiko
// ============================================================================
/**
 * Memetakan kode risk_level menjadi label deskriptif:
 * - "RR"  → "RISIKO RENDAH"
 * - "RT"  → "RISIKO TINGGI"
 * - "RST" → "RISIKO SANGAT TINGGI"
 * - Selain itu → null
 */
export function mapRisiko(riskLevel: string | null | undefined): string | null {
  if (!riskLevel || typeof riskLevel !== "string") return null;
  const upper = riskLevel.trim().toUpperCase();
  if (upper === "RR") return "RISIKO RENDAH";
  if (upper === "RT") return "RISIKO TINGGI";
  if (upper === "RST") return "RISIKO SANGAT TINGGI";
  return null;
}

// ============================================================================
// 13. keTanggalId
// ============================================================================
/**
 * Mengonversi tanggal ISO "YYYY-MM-DD" menjadi "DD-MM-YYYY" (tahun tetap sama).
 * Contoh: "2026-03-12" → "12-03-2026".
 */
export function keTanggalId(isoDate: string | null | undefined): string {
  if (!isoDate || typeof isoDate !== "string") return "";
  const trimmed = isoDate.trim();
  const datePart = trimmed.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    if (year && month && day) {
      return `${day}-${month}-${year}`;
    }
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return trimmed;
}

// ============================================================================
// 14. Modul Persalinan & BBL untuk Laporan Bulanan
// ============================================================================

export interface PersalinanLaporanBayi {
  id: string;
  nama_bayi: string | null;
  jenis_kelamin: "L" | "P" | null;
  bbl_gram: number | null;
  pbl_cm: number | null;
  lk_cm: number | null;
  ld_cm: number | null;
  spo2_tangan_kanan: number | null;
  spo2_kaki: number | null;
  skrining_shk: "YA" | "TIDAK" | "Pending" | null;
}

export interface PersalinanLaporanRecord {
  id: string;
  patient_id: string;
  delivery_datetime: string;
  tempat: "TPMB" | "LUAR";
  tempat_luar_nama?: string | null;
  normal: boolean;
  rujuk: boolean;
  tujuan_rujuk?: string | null;
  keterangan?: string | null;
  staff_name?: string | null;
  patient_name?: string | null;
  patient_nik?: string | null;
  patient_birth_date?: string | null;
  patient_address?: string | null;
  patient_husband_name?: string | null;
  patient_phone?: string | null;
  patient_type?: string | null;
  bayi_list: PersalinanLaporanBayi[];
}

export interface PersalinanSheetRow {
  no: number;
  namaPasien: string;
  nikPasien: string;
  tglLahir: string;
  alamat: string;
  namaSuami: string;
  noWhatsapp: string;
  rujukTidak: string; // 'RUJUK (tujuan)' atau 'TIDAK'
  np: string; // 'V' jika normal
  tglJamPersalinan: string;
  namaBayi: string;
  jenisKelamin: string; // 'L' atau 'P'
  bbl: number | string;
  pbl: number | string;
  lk: number | string;
  ld: number | string;
  spo2Tangan: number | string;
  spo2Kaki: number | string;
  shkYa: string; // 'V' jika YA, '' jika TIDAK / Pending / null
  shkTidak: string; // 'V' jika TIDAK, '' jika YA / Pending / null
  pkgSudah: string; // ''
  pkgBelum: string; // 'V'
  keterangan: string;
}

/**
 * Filter persalinan berdasarkan bulan dan tahun delivery_datetime, dan HANYA tempat = 'TPMB'.
 */
export function filterPersalinanBulan(
  records: PersalinanLaporanRecord[],
  tahun: number,
  bulan: number
): PersalinanLaporanRecord[] {
  return records.filter((r) => {
    if (r.tempat !== "TPMB") return false;
    if (!r.delivery_datetime) return false;
    const d = new Date(r.delivery_datetime);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === tahun && d.getMonth() + 1 === bulan;
  });
}

/**
 * Bentuk baris-baris sheet PERSALINAN - BBL.
 * Setiap bayi menghasilkan SATU baris. Jika ibu punya anak kembar, menghasilkan dua baris.
 */
export function bentukBarisPersalinan(
  records: PersalinanLaporanRecord[]
): PersalinanSheetRow[] {
  const rows: PersalinanSheetRow[] = [];
  let no = 1;

  for (const rec of records) {
    const d = new Date(rec.delivery_datetime);
    const tglJamStr = isNaN(d.getTime())
      ? rec.delivery_datetime
      : `${keTanggalId(d.toISOString().slice(0, 10))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const rujukStr = rec.rujuk
      ? rec.tujuan_rujuk ? `RUJUK (${rec.tujuan_rujuk})` : "RUJUK"
      : "TIDAK";

    const npStr = rec.normal ? "V" : "";

    // Jika bayi_list kosong, buat minimal 1 baris
    const babies = rec.bayi_list && rec.bayi_list.length > 0 ? rec.bayi_list : [null];

    for (const b of babies) {
      let shkYa = "";
      let shkTidak = "";
      if (b && b.skrining_shk === "YA") {
        shkYa = "V";
      } else if (b && b.skrining_shk === "TIDAK") {
        shkTidak = "V";
      }
      // Bila null atau 'Pending', keduanya tetap "" (dikosongkan sesuai instruksi)

      rows.push({
        no: no++,
        namaPasien: (rec.patient_name || "").toUpperCase(),
        nikPasien: rec.patient_nik || "-",
        tglLahir: rec.patient_birth_date ? keTanggalId(rec.patient_birth_date) : "-",
        alamat: (rec.patient_address || "-").toUpperCase(),
        namaSuami: (rec.patient_husband_name || "-").toUpperCase(),
        noWhatsapp: rec.patient_phone || "-",
        rujukTidak: rujukStr,
        np: npStr,
        tglJamPersalinan: tglJamStr,
        namaBayi: b?.nama_bayi ? b.nama_bayi.toUpperCase() : "-",
        jenisKelamin: b?.jenis_kelamin || "-",
        bbl: b?.bbl_gram ?? "-",
        pbl: b?.pbl_cm ?? "-",
        lk: b?.lk_cm ?? "-",
        ld: b?.ld_cm ?? "-",
        spo2Tangan: b?.spo2_tangan_kanan ?? "-",
        spo2Kaki: b?.spo2_kaki ?? "-",
        shkYa,
        shkTidak,
        pkgSudah: "",
        pkgBelum: "V",
        keterangan: rec.keterangan || (rec.staff_name ? `Bidan: ${rec.staff_name}` : ""),
      });
    }
  }

  return rows;
}

