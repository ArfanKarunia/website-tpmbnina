/**
 * Helper Perhitungan & Penentuan Status Kehamilan TPMB Nina Rahayu
 * Zona waktu default: Asia/Jakarta (WIB)
 */

export type StatusKehamilan = 'HAMIL_AKTIF' | 'PERLU_FOLLOW_UP' | 'PERLU_KOREKSI';

export const AMBANG_FOLLOW_UP_MINGGU = 41;

/**
 * Mendapatkan objek Date pada jam 00:00:00 untuk tanggal hari ini di zona waktu Asia/Jakarta (WIB).
 */
export function getTodayJakarta(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(now).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Mem-parse string tanggal (YYYY-MM-DD atau ISO) menjadi objek Date pada jam 00:00:00 lokal.
 */
export function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const d = new Date(year, month, day, 0, 0, 0, 0);
  if (isNaN(d.getTime())) return null;
  return d;
}

export interface HasilHitungKehamilan {
  ukWeeks: number;
  ukDays: number;
  totalDays: number;
  hplDate: Date | null;
  hplFormatted: string;
  trimester: number;
  status: StatusKehamilan | 'TIDAK_HAMIL';
  statusText: string;
}

/**
 * Hitung Usia Kehamilan (UK), HPL (rumus Naegele), Trimester, dan Status Kehamilan.
 */
export function hitungKehamilan(
  hphtString: string | null | undefined,
  refDate?: Date
): HasilHitungKehamilan {
  if (!hphtString || !hphtString.trim()) {
    return {
      ukWeeks: -1,
      ukDays: 0,
      totalDays: 0,
      hplDate: null,
      hplFormatted: '-',
      trimester: 0,
      status: 'TIDAK_HAMIL',
      statusText: '-',
    };
  }

  const hpht = parseDateOnly(hphtString);
  if (!hpht) {
    return {
      ukWeeks: -1,
      ukDays: 0,
      totalDays: 0,
      hplDate: null,
      hplFormatted: '-',
      trimester: 0,
      status: 'PERLU_KOREKSI',
      statusText: 'Format HPHT Tidak Valid',
    };
  }

  const today = refDate ? new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0) : getTodayJakarta();

  // Rumus Naegele untuk HPL
  const hplDate = new Date(hpht);
  if (hplDate.getMonth() <= 2) {
    hplDate.setMonth(hplDate.getMonth() + 9);
  } else {
    hplDate.setMonth(hplDate.getMonth() - 3);
    hplDate.setFullYear(hplDate.getFullYear() + 1);
  }
  hplDate.setDate(hplDate.getDate() + 7);

  const hplFormatted = hplDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Hitung selisih hari
  const diffTime = today.getTime() - hpht.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const ukWeeks = Math.floor(totalDays / 7);
  const ukDays = ((totalDays % 7) + 7) % 7;

  // Tentukan status
  let status: StatusKehamilan = 'HAMIL_AKTIF';
  if (totalDays < 0 || ukWeeks < 0) {
    status = 'PERLU_KOREKSI';
  } else if (ukWeeks >= AMBANG_FOLLOW_UP_MINGGU) {
    status = 'PERLU_FOLLOW_UP';
  } else {
    status = 'HAMIL_AKTIF';
  }

  // Tentukan Trimester & status klinis teks
  let trimester = 1;
  let statusText = 'Aman';

  if (ukWeeks > 13 && ukWeeks <= 27) {
    trimester = 2;
    statusText = 'Aman';
  } else if (ukWeeks > 27) {
    trimester = 3;
    if (ukWeeks >= AMBANG_FOLLOW_UP_MINGGU) {
      statusText = 'Perlu Follow-up';
    } else if (ukWeeks >= 37) {
      statusText = 'Siaga';
    } else {
      statusText = 'Pantau';
    }
  }

  if (status === 'PERLU_KOREKSI') {
    statusText = 'Perlu Koreksi';
  }

  return {
    ukWeeks,
    ukDays,
    totalDays,
    hplDate,
    hplFormatted,
    trimester,
    status,
    statusText,
  };
}

/**
 * Fungsi klasifikasi status kehamilan murni.
 * Ambang: UK < 0 -> PERLU_KOREKSI, UK >= 41 -> PERLU_FOLLOW_UP, selain itu -> HAMIL_AKTIF.
 */
export function tentukanStatusKehamilan(params: {
  hpht: string | null | undefined;
  refDate?: Date;
}): StatusKehamilan {
  const hasil = hitungKehamilan(params.hpht, params.refDate);
  if (hasil.status === 'TIDAK_HAMIL') {
    return 'PERLU_KOREKSI';
  }
  return hasil.status;
}

