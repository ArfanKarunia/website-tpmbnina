/**
 * lib/protokolDosis.ts
 *
 * Fungsi murni (pure functions) untuk perhitungan takaran obat,
 * normalisasi teks diagnosa, pencocokan alias protokol,
 * dan penyaringan entri protokol berdasarkan konteks pasien.
 *
 * Sesuai Dokumen Spesifikasi: docs/protokol_obat_architecture.md (§7 & §2)
 */

export interface ProtocolEntry {
  id?: string;
  diagnosis_name: string;
  patient_group?: string;
  age_min_value?: number | null;
  age_max_value?: number | null;
  age_unit?: string | null; // HARI, BLN, TH
  weight_min_kg?: number | null;
  weight_max_kg?: number | null;
  medicine_name: string;
  dosage_form: string;
  concentration?: string | null; // misal "120 mg/5 ml" atau "125 mg/5ml"
  dose_mg_per_kg?: number | null;
  dose_fixed_amount?: number | null;
  dose_unit?: string | null; // ml, tablet, kapsul, tetes, mg, dll
  frequency?: string | null;
  duration?: string | null;
  max_dose?: string | null;
  requirements?: string | null;
  contraindications?: string | null;
  red_flags?: string[] | null;
  owner_notes?: string | null;
  status?: string;
}

export interface DiagnosisAlias {
  alias: string;
  diagnosis_name: string;
}

export interface PatientContext {
  ageDays?: number | null;
  weightKg?: number | null;
}

export interface DoseCalculationResult {
  success: boolean;
  type: 'weight_based' | 'fixed_amount';
  doseMg?: number;
  rawAmount?: number;
  roundedAmount?: number;
  unit: string;
  exceedsMax?: boolean;
  maxDoseRaw?: string | null;
  warning?: string;
  error?: string;
}

/**
 * 1. normalizeDiagnosisText(teks)
 * Mengubah ke huruf besar, memangkas spasi di ujung, menggabungkan spasi ganda,
 * dan menghilangkan tanda baca.
 */
export function normalizeDiagnosisText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toUpperCase()
    // Hapus tanda baca (simbol, punctuation) kecuali huruf dan angka
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    // Gabungkan spasi ganda / whitespace menjadi satu spasi
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 2. findProtocolDiagnosis(query, aliases)
 * aliases adalah array { alias, diagnosis_name } yang diasumsikan sudah ternormalisasi
 * (atau dinormalisasi saat perbandingan).
 *
 * Prioritas:
 * 1. Exact match (alias == query)
 * 2. Substring match (query ada di dalam alias atau sebaliknya).
 *    Jika ada beberapa yang cocok, pilih alias yang paling panjang (paling spesifik).
 * Bila tidak ada sama sekali, kembalikan null.
 */
export function findProtocolDiagnosis(
  query: string,
  aliases: DiagnosisAlias[]
): string | null {
  const normQuery = normalizeDiagnosisText(query);
  if (!normQuery) return null;

  // 1. Cek Exact Match
  for (const item of aliases) {
    const normAlias = normalizeDiagnosisText(item.alias);
    if (normAlias === normQuery) {
      return item.diagnosis_name;
    }
  }

  // 2. Substring Match (query di dalam alias atau alias di dalam query)
  let bestMatch: DiagnosisAlias | null = null;
  let maxMatchedLength = -1;

  for (const item of aliases) {
    const normAlias = normalizeDiagnosisText(item.alias);
    if (!normAlias) continue;

    const isQueryInAlias = normAlias.includes(normQuery);
    const isAliasInQuery = normQuery.includes(normAlias);

    if (isQueryInAlias || isAliasInQuery) {
      if (normAlias.length > maxMatchedLength) {
        maxMatchedLength = normAlias.length;
        bestMatch = item;
      }
    }
  }

  return bestMatch ? bestMatch.diagnosis_name : null;
}

/**
 * 3. parsePatientAge(teks)
 * Mengurai format umur pasien project ini ("2 TH", "5 BLN", "10 HARI")
 * menjadi jumlah total hari (TH = 365 hari, BLN = 30 hari, HARI = 1 hari).
 * Bila format tidak valid / tidak bisa diparse, kembalikan null.
 */
export function parsePatientAge(ageText: string | null | undefined): number | null {
  if (!ageText) return null;
  const clean = ageText.trim().toUpperCase();

  // Pola angka desimal/bulat diikuti satuan
  // Contoh: "2 TH", "2.5 TH", "2,5 TH", "5 BLN", "10 HARI"
  const match = clean.match(/^([\d.,]+)\s*(TH|TAHUN|BLN|BULAN|HARI|HR)$/i);
  if (!match) return null;

  const numStr = match[1].replace(',', '.');
  const value = parseFloat(numStr);
  if (isNaN(value) || value < 0) return null;

  const unit = match[2].toUpperCase();
  if (unit.startsWith('TH')) {
    return Math.round(value * 365);
  }
  if (unit.startsWith('BLN')) {
    return Math.round(value * 30);
  }
  if (unit.startsWith('HARI') || unit === 'HR') {
    return Math.round(value * 1);
  }

  return null;
}

/**
 * Helper internal untuk mengonversi nilai usia entri protokol ke satuan hari.
 */
function convertAgeToDays(value: number | null | undefined, unit: string | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(Number(value))) return null;
  const num = Number(value);
  const u = (unit || 'TH').toUpperCase().trim();

  if (u.startsWith('TH')) return Math.round(num * 365);
  if (u.startsWith('BLN')) return Math.round(num * 30);
  if (u.startsWith('HARI') || u === 'HR') return Math.round(num * 1);

  return Math.round(num * 365); // default fallback tahun
}

/**
 * 4. filterEntriesByContext(entries, context)
 * Menyaring entri protokol. Entri lolos hanya bila:
 * (a) ageDays berada dalam rentang usia entri (null = tidak membatasi).
 * (b) weightKg berada dalam rentang BB entri (null = tidak membatasi).
 */
export function filterEntriesByContext(
  entries: ProtocolEntry[],
  context: PatientContext
): ProtocolEntry[] {
  const { ageDays, weightKg } = context;

  return entries.filter((entry) => {
    // Validasi Rentang Usia
    if (ageDays !== null && ageDays !== undefined) {
      const minDays = convertAgeToDays(entry.age_min_value, entry.age_unit);
      const maxDays = convertAgeToDays(entry.age_max_value, entry.age_unit);

      if (minDays !== null && ageDays < minDays) return false;
      if (maxDays !== null && ageDays > maxDays) return false;
    }

    // Validasi Rentang Berat Badan
    if (weightKg !== null && weightKg !== undefined) {
      const minKg = entry.weight_min_kg !== null && entry.weight_min_kg !== undefined
        ? Number(entry.weight_min_kg)
        : null;
      const maxKg = entry.weight_max_kg !== null && entry.weight_max_kg !== undefined
        ? Number(entry.weight_max_kg)
        : null;

      if (minKg !== null && !isNaN(minKg) && weightKg < minKg) return false;
      if (maxKg !== null && !isNaN(maxKg) && weightKg > maxKg) return false;
    }

    return true;
  });
}

/**
 * Helper internal untuk mengekstrak konsentrasi cair ("120 mg/5 ml", "125mg/5ml", "100 mg/ml")
 * Mengembalikan rasio mg per 1 ml.
 */
function parseConcentrationRatio(concentration: string | null | undefined): number | null {
  if (!concentration) return null;
  const clean = concentration.toLowerCase().trim();

  // Pola: "120 mg / 5 ml" atau "120mg/5ml" atau "100 mg / ml"
  const match = clean.match(/([\d.,]+)\s*mg\s*\/\s*([\d.,]*)\s*ml/);
  if (!match) return null;

  const mgVal = parseFloat(match[1].replace(',', '.'));
  const mlStr = match[2] ? match[2].replace(',', '.') : '1';
  const mlVal = parseFloat(mlStr || '1');

  if (isNaN(mgVal) || isNaN(mlVal) || mgVal <= 0 || mlVal <= 0) {
    return null;
  }

  return mgVal / mlVal; // contoh: 120 / 5 = 24 mg per ml
}

/**
 * Helper internal untuk mengekstrak angka dari string max_dose jika ada (misal: "500 mg", "1000 mg/hari").
 */
function parseMaxDoseMg(maxDoseStr: string | null | undefined): number | null {
  if (!maxDoseStr) return null;
  const match = maxDoseStr.replace(',', '.').match(/([\d.]+)\s*mg/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * 5. computeDose(entry, weightKg)
 * Menghitung takaran obat berdasarkan Dokumen Arsitektur §7:
 * - Jika dose_mg_per_kg terisi: dosisMg = dose_mg_per_kg * weightKg.
 *   Cek terhadap max_dose jika dapat diparse.
 *   Untuk sediaan cair (atau unit ml): hitung takaran ml = dosisMg / mgPerMl,
 *   bulatkan ke 0.5 ml terdekat, sertakan nilai mentah.
 *   Jika konsentrasi tidak bisa diparse, kembalikan dosis mg saja + peringatan.
 * - Jika dose_fixed_amount terisi: kembalikan nilai apa adanya dalam dose_unit.
 * - Bila data tidak mencukupi, jangan mengarang angka: kembalikan error/alasan jelas.
 */
export function computeDose(
  entry: ProtocolEntry,
  weightKg?: number | null
): DoseCalculationResult {
  // 1. Skema Dosis Tetap (Fixed Amount)
  if (entry.dose_fixed_amount !== null && entry.dose_fixed_amount !== undefined) {
    const fixedAmount = Number(entry.dose_fixed_amount);
    if (!isNaN(fixedAmount)) {
      return {
        success: true,
        type: 'fixed_amount',
        rawAmount: fixedAmount,
        roundedAmount: fixedAmount,
        unit: entry.dose_unit || 'tablet',
        maxDoseRaw: entry.max_dose || null,
      };
    }
  }

  // 2. Skema Berbasis Berat Badan (dose_mg_per_kg)
  if (entry.dose_mg_per_kg !== null && entry.dose_mg_per_kg !== undefined) {
    if (weightKg === null || weightKg === undefined || isNaN(weightKg) || weightKg <= 0) {
      return {
        success: false,
        type: 'weight_based',
        unit: entry.dose_unit || 'mg',
        error: 'Berat badan pasien belum diisi atau tidak valid untuk perhitungan dosis berbasis BB.',
      };
    }

    const mgPerKg = Number(entry.dose_mg_per_kg);
    if (isNaN(mgPerKg) || mgPerKg <= 0) {
      return {
        success: false,
        type: 'weight_based',
        unit: entry.dose_unit || 'mg',
        error: 'Parameter dose_mg_per_kg pada entri protokol tidak valid.',
      };
    }

    const dosisMg = mgPerKg * weightKg;

    // Pengecekan terhadap max_dose
    const maxMg = parseMaxDoseMg(entry.max_dose);
    const exceedsMax = maxMg !== null ? dosisMg > maxMg : false;

    // Deteksi apakah sediaan memerlukan konversi ke volume (ml)
    const isLiquid =
      (entry.dosage_form && /sirup|syrup|drop|tetes|larutan|suspensi|cair/i.test(entry.dosage_form)) ||
      (entry.dose_unit && entry.dose_unit.toLowerCase() === 'ml') ||
      Boolean(entry.concentration);

    if (isLiquid) {
      const mgPerMl = parseConcentrationRatio(entry.concentration);
      if (mgPerMl !== null) {
        const rawMl = dosisMg / mgPerMl;
        // Pembulatan ke 0.5 ml terdekat
        const roundedMl = Math.round(rawMl * 2) / 2;

        return {
          success: true,
          type: 'weight_based',
          doseMg: dosisMg,
          rawAmount: rawMl,
          roundedAmount: roundedMl,
          unit: 'ml',
          exceedsMax,
          maxDoseRaw: entry.max_dose || null,
        };
      } else {
        // Konsentrasi tidak bisa diparse
        return {
          success: true,
          type: 'weight_based',
          doseMg: dosisMg,
          rawAmount: dosisMg,
          roundedAmount: dosisMg,
          unit: 'mg',
          exceedsMax,
          maxDoseRaw: entry.max_dose || null,
          warning: 'Konsentrasi sediaan belum terisi atau belum bisa diparse (format baku: "X mg/Y ml"). Takaran disajikan dalam satuan mg.',
        };
      }
    }

    // Jika non-liquid tapi berbasis BB (misal puyer/serbuk)
    return {
      success: true,
      type: 'weight_based',
      doseMg: dosisMg,
      rawAmount: dosisMg,
      roundedAmount: Math.round(dosisMg * 100) / 100,
      unit: entry.dose_unit || 'mg',
      exceedsMax,
      maxDoseRaw: entry.max_dose || null,
    };
  }

  // 3. Data tidak cukup untuk menghitung
  return {
    success: false,
    type: 'fixed_amount',
    unit: entry.dose_unit || '',
    error: 'Data takaran pada entri protokol tidak lengkap (tidak ada dose_mg_per_kg maupun dose_fixed_amount).',
  };
}

