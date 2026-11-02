"use client";

import React, { useState } from "react";
import ExcelJS from "exceljs";
import { createClient } from "@/app/utils/supabase/client";
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
} from "lucide-react";
import {
  filterBulan,
  kelompokUmur,
  mapPenyakit,
  isKbRecord,
  getKbMethod,
  tampilJenisKb,
  tentukanBaruLama,
  getUmumBpjs,
  hitungTP,
  parseGpa,
  formatGpa,
  tentukanSheet,
  mapRisiko,
  keTanggalId,
  MedicalRecordInput,
  KodePenyakit,
  KelompokUmur,
} from "@/lib/laporanBulanan";

interface PatientInfo {
  id: string;
  nik?: string | null;
  birth_date?: string | null;
  type?: string | null;
  husband_name?: string | null;
  hpht?: string | null;
}

interface SummaryData {
  total: number;
  balitaCount: number;
  umumCount: number;
  ancCount: number;
  kbCount: number;
  persalinanCount: number;
  ptmCount: number;
  pmCount: number;
  excludedNullCount: number;
  filename: string;
}

// Helper konversi nama kolom Excel (misal "A" -> 1, "AB" -> 28)
function colToNum(colStr: string): number {
  let num = 0;
  for (let i = 0; i < colStr.length; i++) {
    num = num * 26 + (colStr.charCodeAt(i) - 64);
  }
  return num;
}

// Helper untuk menyisipkan kolom UMUM & BPJS sebelum STATUS INPUT PKG
function insertUmumBpjsBeforePkg(ws: ExcelJS.Worksheet, pkgStartCol: number) {
  const currentMerges = [...(ws.model.merges || [])];
  const newMerges: { c1: number; r1: number; c2: number; r2: number }[] = [];

  // Hitung ulang merge koordinat
  currentMerges.forEach((m) => {
    try {
      ws.unMergeCells(m);
    } catch {
      // Abaikan jika cell belum ter-merge
    }
    const match = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (match) {
      const c1 = colToNum(match[1]);
      const r1 = parseInt(match[2], 10);
      const c2 = colToNum(match[3]);
      const r2 = parseInt(match[4], 10);
      if (c1 >= pkgStartCol) {
        newMerges.push({ c1: c1 + 2, r1, c2: c2 + 2, r2 });
      } else {
        newMerges.push({ c1, r1, c2, r2 });
      }
    }
  });

  const maxCol = Math.max(ws.columnCount, pkgStartCol + 5);

  // Geser sel baris 1-5 ke kanan sebesar 2 kolom
  for (let r = 1; r <= 5; r++) {
    for (let c = maxCol; c >= pkgStartCol; c--) {
      const srcCell = ws.getCell(r, c);
      const dstCell = ws.getCell(r, c + 2);
      dstCell.value = srcCell.value;
      if (srcCell.style) {
        dstCell.style = JSON.parse(JSON.stringify(srcCell.style));
      }
      srcCell.value = null;
    }
  }

  // Ambil gaya header dari kolom acuan (kolom 6)
  const refHeaderStyle = ws.getCell(4, 6).style
    ? JSON.parse(JSON.stringify(ws.getCell(4, 6).style))
    : {};

  // Set header UMUM
  const cellUmum4 = ws.getCell(4, pkgStartCol);
  cellUmum4.value = "UMUM";
  cellUmum4.style = refHeaderStyle;
  const cellUmum5 = ws.getCell(5, pkgStartCol);
  cellUmum5.value = "UMUM";
  cellUmum5.style = refHeaderStyle;

  // Set header BPJS
  const cellBpjs4 = ws.getCell(4, pkgStartCol + 1);
  cellBpjs4.value = "BPJS";
  cellBpjs4.style = refHeaderStyle;
  const cellBpjs5 = ws.getCell(5, pkgStartCol + 1);
  cellBpjs5.value = "BPJS";
  cellBpjs5.style = refHeaderStyle;

  // Set lebar kolom
  ws.getColumn(pkgStartCol + 2).width = ws.getColumn(pkgStartCol).width || 12;
  ws.getColumn(pkgStartCol + 3).width = ws.getColumn(pkgStartCol + 1).width || 12;
  ws.getColumn(pkgStartCol + 4).width = ws.getColumn(pkgStartCol + 2).width || 12;
  ws.getColumn(pkgStartCol).width = 15;
  ws.getColumn(pkgStartCol + 1).width = 10;

  // Terapkan kembali seluruh merge yang sudah digeser
  newMerges.forEach((m) => {
    try {
      ws.mergeCells(m.r1, m.c1, m.r2, m.c2);
    } catch {
      // Abaikan jika ada konflik merge
    }
  });

  // Tambahkan merge vertikal untuk kolom baru UMUM dan BPJS (baris 4-5)
  try {
    ws.mergeCells(4, pkgStartCol, 5, pkgStartCol);
    ws.mergeCells(4, pkgStartCol + 1, 5, pkgStartCol + 1);
  } catch {
    // Abaikan jika sudah ter-merge
  }
}

export default function LaporanBulananButton() {
  const getDefaultMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getDefaultMonth);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const NAMA_BULAN_MAP = [
    "",
    "JANUARI",
    "FEBRUARI",
    "MARET",
    "APRIL",
    "MEI",
    "JUNI",
    "JULI",
    "AGUSTUS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DESEMBER",
  ];

  const handleExport = async () => {
    if (!selectedMonth) {
      setErrorMessage("Silakan pilih bulan laporan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const supabase = createClient();
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const namaBulan = NAMA_BULAN_MAP[month] || "BULAN";

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDay
      ).padStart(2, "0")}`;

      // ------------------------------------------------------------------------
      // a. Ambil medical_records dengan paginasi
      // ------------------------------------------------------------------------
      setStatusMessage("Mengambil data rekam medis bulanan...");
      const PAGE_SIZE = 1000;
      let from = 0;
      let allRecords: MedicalRecordInput[] = [];
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("medical_records")
          .select("*")
          .gte("visit_date", startDate)
          .lte("visit_date", endDate)
          .order("visit_date", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          throw new Error(`Gagal mengambil data rekam medis: ${error.message}`);
        }

        if (data && data.length > 0) {
          allRecords = allRecords.concat(data);
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            from += PAGE_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      // Saring dengan fungsi murni filterBulan
      const { filteredRecords, excludedNullVisitDateCount } = filterBulan(
        allRecords,
        year,
        month
      );

      // ------------------------------------------------------------------------
      // b. Ambil data pasien unik dengan batching maksimal 100 ID
      // ------------------------------------------------------------------------
      setStatusMessage("Mengambil data identitas pasien...");
      const uniquePatientIds = Array.from(
        new Set(
          filteredRecords
            .map((r) => r.patient_id)
            .filter(Boolean) as string[]
        )
      );

      const patientMap = new Map<string, PatientInfo>();

      if (uniquePatientIds.length > 0) {
        const BATCH_SIZE = 100;
        const batches: string[][] = [];
        for (let i = 0; i < uniquePatientIds.length; i += BATCH_SIZE) {
          batches.push(uniquePatientIds.slice(i, i + BATCH_SIZE));
        }

        const patientBatchResults = await Promise.all(
          batches.map(async (batch, idx) => {
            const { data, error } = await supabase
              .from("patients")
              .select("id, nik, birth_date, type, husband_name, hpht")
              .in("id", batch);

            if (error) {
              throw new Error(
                `Batch pasien ${idx + 1} (${batch.length} ID) gagal: ${error.message}`
              );
            }
            return data || [];
          })
        );

        for (const list of patientBatchResults) {
          for (const p of list) {
            patientMap.set(p.id, p);
          }
        }
      }

      // ------------------------------------------------------------------------
      // c. Ambil riwayat KB pasien untuk status BARU/LAMA
      // ------------------------------------------------------------------------
      setStatusMessage("Menghitung riwayat kunjungan KB...");
      const kbRecordsInMonth = filteredRecords.filter((r) =>
        isKbRecord(r.diagnosis, r.action, r.therapy)
      );
      const kbPatientIds = Array.from(
        new Set(
          kbRecordsInMonth
            .map((r) => r.patient_id)
            .filter(Boolean) as string[]
        )
      );

      const patientKbHistoryMap = new Map<
        string,
        Array<{ id: string; visit_date?: string | null }>
      >();

      if (kbPatientIds.length > 0) {
        const BATCH_SIZE = 100;
        const kbBatches: string[][] = [];
        for (let i = 0; i < kbPatientIds.length; i += BATCH_SIZE) {
          kbBatches.push(kbPatientIds.slice(i, i + BATCH_SIZE));
        }

        const kbHistoryResults = await Promise.all(
          kbBatches.map(async (batch, idx) => {
            const { data, error } = await supabase
              .from("medical_records")
              .select("id, patient_id, visit_date, diagnosis, action, therapy")
              .in("patient_id", batch)
              .order("visit_date", { ascending: true });

            if (error) {
              throw new Error(
                `Riwayat KB batch ${idx + 1} gagal: ${error.message}`
              );
            }
            return data || [];
          })
        );

        for (const list of kbHistoryResults) {
          for (const rec of list) {
            if (
              isKbRecord(rec.diagnosis, rec.action, rec.therapy) &&
              rec.patient_id
            ) {
              let history = patientKbHistoryMap.get(rec.patient_id);
              if (!history) {
                history = [];
                patientKbHistoryMap.set(rec.patient_id, history);
              }
              history.push({ id: rec.id, visit_date: rec.visit_date });
            }
          }
        }
      }

      // ------------------------------------------------------------------------
      // d. Buka template Excel menggunakan fetch
      // ------------------------------------------------------------------------
      setStatusMessage("Mempersiapkan format laporan Excel...");
      const res = await fetch("/template-laporan-standar.xlsx");
      if (!res.ok) {
        throw new Error(
          `Gagal memuat template-laporan-standar.xlsx (${res.status} ${res.statusText})`
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);

      // ------------------------------------------------------------------------
      // e. Hapus baris data pasien dari template pada 5 sheet rincian
      // ------------------------------------------------------------------------
      const detailSheetNames = [
        "BALITA-SAKIT",
        "UMUM-SAKIT",
        "HAMIL (ANC)",
        "PERSALINAN - BBL",
        "KB",
      ];

      for (const name of detailSheetNames) {
        const ws = wb.getWorksheet(name);
        if (ws) {
          while (ws.rowCount > 5) {
            ws.spliceRows(ws.rowCount, 1);
          }
        }
      }

      // ------------------------------------------------------------------------
      // f. Sisipkan 2 kolom UMUM & BPJS pada 3 sheet yang memerlukan
      // ------------------------------------------------------------------------
      const wsAnc = wb.getWorksheet("HAMIL (ANC)");
      if (wsAnc) insertUmumBpjsBeforePkg(wsAnc, 12);

      const wsKb = wb.getWorksheet("KB");
      if (wsKb) insertUmumBpjsBeforePkg(wsKb, 11);

      const wsPersalinan = wb.getWorksheet("PERSALINAN - BBL");
      if (wsPersalinan) insertUmumBpjsBeforePkg(wsPersalinan, 21);

      // ------------------------------------------------------------------------
      // g. Isi data kunjungan bulan terpilih ke 4 sheet rincian
      // ------------------------------------------------------------------------
      setStatusMessage("Menulis data rincian pasien...");
      const wsBalita = wb.getWorksheet("BALITA-SAKIT");
      const wsUmum = wb.getWorksheet("UMUM-SAKIT");

      let balitaCount = 0;
      let umumCount = 0;
      let ancCount = 0;
      let kbCount = 0;

      // Helper untuk menerapkan styling sel data
      const applyDataRowStyle = (row: ExcelJS.Row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      };

      for (const rec of filteredRecords) {
        const targetSheet = tentukanSheet(rec);
        const patient = rec.patient_id ? patientMap.get(rec.patient_id) : undefined;
        const birthDateStr = patient?.birth_date
          ? keTanggalId(patient.birth_date)
          : "-";
        const diagPenyakit = mapPenyakit(rec.diagnosis);

        if (targetSheet === "BALITA" && wsBalita) {
          balitaCount++;
          const cDiare = diagPenyakit === "DIARE" ? 1 : null;
          const cIspa = diagPenyakit === "ISPA" ? 1 : null;
          const cPneumonia = diagPenyakit === "PNEUMONIA" ? 1 : null;
          const cDengue = diagPenyakit === "DENGUE" ? 1 : null;
          const cTifoid = diagPenyakit === "TIFOID" ? 1 : null;
          const cTbc = diagPenyakit === "TBC" ? 1 : null;
          const cDm = diagPenyakit === "DM" ? 1 : null;
          const cLainnya =
            !cDiare && !cIspa && !cPneumonia && !cDengue && !cTifoid && !cTbc && !cDm
              ? 1
              : null;

          const rowValues = [
            balitaCount,
            rec.patient_name || "-",
            patient?.nik || "-",
            birthDateStr,
            rec.patient_address || "-",
            patient?.husband_name || "-",
            rec.weight ?? null,
            rec.height_cm ?? null,
            rec.lp_cm ?? null,
            rec.lila_cm ?? null,
            cDiare,
            cIspa,
            cPneumonia,
            cDengue,
            cTifoid,
            cTbc,
            cDm,
            cLainnya,
            rec.diagnosis || "-",
            null,
            null,
            null,
          ];
          const newRow = wsBalita.addRow(rowValues);
          applyDataRowStyle(newRow);
        } else if (targetSheet === "UMUM" && wsUmum) {
          umumCount++;
          const cDiare = diagPenyakit === "DIARE" ? 1 : null;
          const cIspa = diagPenyakit === "ISPA" ? 1 : null;
          const cPneumonia = diagPenyakit === "PNEUMONIA" ? 1 : null;
          const cDengue = diagPenyakit === "DENGUE" ? 1 : null;
          const cTifoid = diagPenyakit === "TIFOID" ? 1 : null;
          const cTbc = diagPenyakit === "TBC" ? 1 : null;
          const cHt = diagPenyakit === "HT" ? 1 : null;
          const cDm = diagPenyakit === "DM" ? 1 : null;
          const cLainnya =
            !cDiare &&
            !cIspa &&
            !cPneumonia &&
            !cDengue &&
            !cTifoid &&
            !cTbc &&
            !cHt &&
            !cDm
              ? 1
              : null;

          const rowValues = [
            umumCount,
            rec.patient_name || "-",
            patient?.nik || "-",
            birthDateStr,
            rec.patient_address || "-",
            rec.weight ?? null,
            rec.height_cm ?? null,
            rec.lp_cm ?? null,
            rec.blood_pressure || "-",
            rec.gds ?? null,
            cDiare,
            cIspa,
            cPneumonia,
            cDengue,
            cTifoid,
            cTbc,
            cHt,
            cDm,
            cLainnya,
            rec.diagnosis || "-",
            null,
            null,
            null,
          ];
          const newRow = wsUmum.addRow(rowValues);
          applyDataRowStyle(newRow);
        } else if (targetSheet === "HAMIL" && wsAnc) {
          ancCount++;
          const tpRaw = hitungTP(patient?.hpht);
          const tpStr = tpRaw ? keTanggalId(tpRaw) : "-";
          const gpaParsed = parseGpa(rec.diagnosis);
          const gpaStr = formatGpa(gpaParsed) || "-";
          const risikoStr = mapRisiko(rec.risk_level) || "-";
          const { umum, bpjs } = getUmumBpjs(patient?.type, rec.total_price);

          const rowValues = [
            ancCount,
            rec.patient_name || "-",
            patient?.nik || "-",
            birthDateStr,
            rec.patient_address || "-",
            patient?.husband_name || "-",
            patient?.hpht ? keTanggalId(patient.hpht) : "-",
            tpStr,
            gpaStr,
            risikoStr,
            rec.tt_status || "-",
            umum,
            bpjs,
            null,
            null,
            null,
          ];
          const newRow = wsAnc.addRow(rowValues);
          applyDataRowStyle(newRow);
        } else if (targetSheet === "KB" && wsKb) {
          kbCount++;
          const history =
            (rec.patient_id && patientKbHistoryMap.get(rec.patient_id)) || [
              { id: rec.id || "" },
            ];
          const statusKunjungan = tentukanBaruLama(history, rec.id || "");
          const jenisKb = tampilJenisKb(
            getKbMethod(rec.diagnosis, rec.action, rec.therapy)
          );
          const { umum, bpjs } = getUmumBpjs(patient?.type, rec.total_price);

          const rowValues = [
            kbCount,
            rec.patient_name || "-",
            patient?.nik || "-",
            birthDateStr,
            rec.patient_address || "-",
            patient?.husband_name || "-",
            statusKunjungan,
            jenisKb,
            rec.anak_terakhir || "-",
            rec.tt_status || "-",
            umum,
            bpjs,
            null,
            null,
            null,
          ];
          const newRow = wsKb.addRow(rowValues);
          applyDataRowStyle(newRow);
        }
      }

      // ------------------------------------------------------------------------
      // h. Dua sheet rekap: PTM dan PENYAKIT MENULAR
      // ------------------------------------------------------------------------
      setStatusMessage("Menghitung rekapitulasi PTM & Penyakit Menular...");
      const wsPtm = wb.getWorksheet("PTM");
      const wsPm = wb.getWorksheet("PENYAKIT MENULAR");

      // Struktur penghitung agregat
      const ptmTally: Record<
        string,
        Record<"<5TH" | "5-17TH" | "DEWASA-LANSIA", number>
      > = {};
      const pmTally: Record<
        string,
        Record<"<5TH" | "5-17TH" | "DEWASA-LANSIA", number>
      > = {};

      const initTally = (
        obj: Record<string, Record<"<5TH" | "5-17TH" | "DEWASA-LANSIA", number>>,
        key: string
      ) => {
        if (!obj[key]) {
          obj[key] = { "<5TH": 0, "5-17TH": 0, "DEWASA-LANSIA": 0 };
        }
      };

      let totalPtmDiagnoses = 0;
      let totalPmDiagnoses = 0;

      for (const rec of filteredRecords) {
        const uGroup = kelompokUmur(rec.patient_age);
        const pCode: KodePenyakit = mapPenyakit(rec.diagnosis);

        if (
          uGroup === "<5TH" ||
          uGroup === "5-17TH" ||
          uGroup === "DEWASA-LANSIA"
        ) {
          // PTM Disease mapping
          if (
            [
              "HT",
              "DM",
              "OBESITAS",
              "JANTUNG",
              "STROKE",
              "PPOK",
              "KANKER_KOLOREKTAL",
              "KANKER_LEHER_RAHIM",
              "KANKER_PAYUDARA",
              "KANKER_PARU",
              "JIWA",
              "EPILEPSI",
              "GX_PENGLIHATAN",
              "GX_PENDENGARAN",
            ].includes(pCode)
          ) {
            initTally(ptmTally, pCode);
            ptmTally[pCode][uGroup]++;
            totalPtmDiagnoses++;
          }

          // PM Disease mapping
          if (
            [
              "DIARE",
              "ISPA",
              "PNEUMONIA",
              "DENGUE",
              "TIFOID",
              "TBC",
              "KUSTA",
              "KECACINGAN",
              "CAMPAK",
              "HEPATITIS_B",
            ].includes(pCode)
          ) {
            initTally(pmTally, pCode);
            pmTally[pCode][uGroup]++;
            totalPmDiagnoses++;
          }
        }
      }

      // Mapping baris PTM pada template
      const ptmRowMap: { row: number; code: KodePenyakit }[] = [
        { row: 6, code: "HT" },
        { row: 7, code: "DM" },
        { row: 8, code: "OBESITAS" },
        { row: 9, code: "JANTUNG" },
        { row: 10, code: "STROKE" },
        { row: 11, code: "PPOK" },
        { row: 12, code: "KANKER_KOLOREKTAL" },
        { row: 13, code: "KANKER_LEHER_RAHIM" },
        { row: 14, code: "KANKER_PAYUDARA" },
        { row: 15, code: "KANKER_PARU" },
        { row: 16, code: "JIWA" },
        { row: 17, code: "EPILEPSI" },
        { row: 18, code: "GX_PENGLIHATAN" },
        { row: 19, code: "GX_PENDENGARAN" },
      ];

      if (wsPtm) {
        for (const item of ptmRowMap) {
          const counts = ptmTally[item.code] || {
            "<5TH": 0,
            "5-17TH": 0,
            "DEWASA-LANSIA": 0,
          };
          wsPtm.getCell(item.row, 3).value = counts["<5TH"];
          wsPtm.getCell(item.row, 4).value = counts["5-17TH"];
          wsPtm.getCell(item.row, 5).value = counts["DEWASA-LANSIA"];

          for (let col = 3; col <= 5; col++) {
            const cell = wsPtm.getCell(item.row, col);
            cell.font = { name: "Calibri", size: 11 };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
        }
        // Baris LAINNYA (row 20)
        wsPtm.getCell(20, 3).value = 0;
        wsPtm.getCell(20, 4).value = 0;
        wsPtm.getCell(20, 5).value = 0;
        for (let col = 3; col <= 5; col++) {
          const cell = wsPtm.getCell(20, col);
          cell.font = { name: "Calibri", size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }

      // Mapping baris PENYAKIT MENULAR pada template
      const pmRowMap: { row: number; code: KodePenyakit }[] = [
        { row: 6, code: "DIARE" },
        { row: 7, code: "ISPA" },
        { row: 8, code: "PNEUMONIA" },
        { row: 9, code: "DENGUE" },
        { row: 10, code: "TIFOID" },
        { row: 11, code: "TBC" },
        { row: 12, code: "KUSTA" },
        { row: 13, code: "KECACINGAN" },
        { row: 14, code: "CAMPAK" },
        { row: 15, code: "HEPATITIS_B" },
      ];

      if (wsPm) {
        for (const item of pmRowMap) {
          const counts = pmTally[item.code] || {
            "<5TH": 0,
            "5-17TH": 0,
            "DEWASA-LANSIA": 0,
          };
          wsPm.getCell(item.row, 3).value = counts["<5TH"];
          wsPm.getCell(item.row, 4).value = counts["5-17TH"];
          wsPm.getCell(item.row, 5).value = counts["DEWASA-LANSIA"];

          for (let col = 3; col <= 5; col++) {
            const cell = wsPm.getCell(item.row, col);
            cell.font = { name: "Calibri", size: 11 };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
        }
        // Baris LAINNYA* (row 16)
        wsPm.getCell(16, 3).value = 0;
        wsPm.getCell(16, 4).value = 0;
        wsPm.getCell(16, 5).value = 0;
        for (let col = 3; col <= 5; col++) {
          const cell = wsPm.getCell(16, col);
          cell.font = { name: "Calibri", size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }

      // ------------------------------------------------------------------------
      // i. Perbarui Kop Baris 2 & 3 di seluruh sheet yang memiliki kop
      // ------------------------------------------------------------------------
      const kopSheets = [
        "BALITA-SAKIT",
        "UMUM-SAKIT",
        "HAMIL (ANC)",
        "PERSALINAN - BBL",
        "KB",
        "IVA PAPSMEAR",
        "PTM",
        "PENYAKIT MENULAR",
      ];

      for (const sName of kopSheets) {
        const s = wb.getWorksheet(sName);
        if (s) {
          s.getCell("A2").value = `BULAN: ${namaBulan}`;
          s.getCell("B2").value = null;
          s.getCell("A3").value = `TAHUN: ${year}`;
          s.getCell("B3").value = null;
        }
      }

      // ------------------------------------------------------------------------
      // j. Simpan dan picu unduhan file
      // ------------------------------------------------------------------------
      setStatusMessage("Menyiapkan unduhan file Excel...");
      const outputFilename = `LAPORAN_TPMB_NINA_RAHAYU_GEDOG_WETAN__${namaBulan}_${year}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = outputFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      // Simpan ringkasan untuk UI
      setSummary({
        total: filteredRecords.length,
        balitaCount,
        umumCount,
        ancCount,
        kbCount,
        persalinanCount: 0,
        ptmCount: totalPtmDiagnoses,
        pmCount: totalPmDiagnoses,
        excludedNullCount: excludedNullVisitDateCount,
        filename: outputFilename,
      });
    } catch (err: any) {
      console.error("[LaporanBulananButton] Error generating report:", err);
      setErrorMessage(
        err?.message || "Terjadi kesalahan tidak terduga saat membuat laporan."
      );
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-1.5 rounded-xl">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={isLoading}
          className="bg-white border border-gray-300 text-xs text-gray-700 px-2.5 py-2 rounded-lg font-semibold outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
          title="Pilih bulan laporan"
        />
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
          title="Unduh laporan bulanan format standar Puskesmas Turen"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet size={16} />
              <span>Unduh Laporan Bulanan</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Status Toast / Info */}
      {isLoading && statusMessage && (
        <div className="text-xs text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="text-xs text-red-800 bg-red-100 border border-red-200 p-2.5 rounded-xl flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary Dialog / Box */}
      {summary && (
        <div className="bg-white border border-emerald-300 p-3.5 rounded-xl shadow-md text-xs space-y-2 relative">
          <div className="flex items-center justify-between border-b pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Laporan Berhasil Dibuat</span>
            </div>
            <button
              onClick={() => setSummary(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
            <div>
              Total Kunjungan:{" "}
              <strong className="text-emerald-700">{summary.total}</strong>
            </div>
            <div>
              Sheet Balita: <strong>{summary.balitaCount}</strong>
            </div>
            <div>
              Sheet Umum: <strong>{summary.umumCount}</strong>
            </div>
            <div>
              Sheet ANC (Hamil): <strong>{summary.ancCount}</strong>
            </div>
            <div>
              Sheet KB: <strong>{summary.kbCount}</strong>
            </div>
            <div>
              Sheet Persalinan: <strong>{summary.persalinanCount}</strong>
            </div>
            <div>
              Rekap PTM: <strong>{summary.ptmCount}</strong>
            </div>
            <div>
              Rekap Penyakit Menular: <strong>{summary.pmCount}</strong>
            </div>
          </div>
          {summary.excludedNullCount > 0 && (
            <div className="text-amber-700 text-[11px] bg-amber-50 p-1.5 rounded border border-amber-200">
              Peringatan: {summary.excludedNullCount} data dilewati karena tanggal kunjungan kosong.
            </div>
          )}
          <div className="text-[11px] text-gray-500 truncate pt-1 border-t">
            File: <span className="font-mono text-gray-700">{summary.filename}</span>
          </div>
        </div>
      )}
    </div>
  );
}
