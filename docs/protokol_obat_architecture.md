# PROTOKOL OBAT — Architecture & Implementation Spec

_TPMB Nina Rahayu — internal system (Next.js App Router i18n `app/[lang]`, Supabase PostgreSQL/Auth/RLS). Dokumen ini adalah satu-satunya acuan implementasi fitur Asisten Protokol Obat. Prompt implementasi akan merujuk dokumen ini per fase/tahap; kerjakan hanya bagian yang dirujuk prompt._

_Terakhir diperbarui: 24 Oktober 2026._

---

## 1. Ringkasan & tujuan

Staff dan anak PKL saat ini mencatat anamnesa pasien di kertas, lalu membawanya ke Bidan Nina sambil berkata "bu mau konsul" — Bidan Nina membaca kertasnya dan menyebutkan nama obatnya. Ini mengganggu beliau di luar jam praktik dan saat istirahat, padahal mayoritas kasusnya rutin.

Fitur **Protokol Obat** memindahkan pengetahuan rutin Bidan Nina ke sistem sebagai **Clinical Decision Support berbasis protokol yang beliau sahkan sendiri** — BUKAN AI penentu obat otonom:

- Staff mencari diagnosa → sistem menampilkan obat & takaran HANYA dari entri protokol berstatus TERVALIDASI.
- Kasus di luar protokol / data tidak lengkap / ada red flag → tidak ada saran obat; staff mengirim **Konsul** digital ke Bidan Nina (pengganti kertas + telepon).
- Bidan Nina menjawab konsul, dan jawabannya bisa disimpan menjadi entri protokol baru dalam satu alur: **jawab sekali, berlaku seterusnya.**

## 2. Prinsip yang tidak bisa ditawar (guardrails)

1. Yang memegang kewenangan klinis adalah Bidan Nina. Sistem tidak pernah mengarang diagnosa, obat, atau angka dosis.
2. Hanya entri berstatus `TERVALIDASI` yang boleh tampil sebagai saran ke staff. Entri dari hasil analisis data masuk sebagai `DRAF` sampai disahkan beliau.
3. Takaran dihitung oleh **aturan tabel** (lihat §7), bukan oleh model AI. AI (bila dipakai nanti) hanya membantu pencocokan tulisan diagnosa ke diagnosa baku.
4. Data konteks tidak lengkap (usia/BB kosong), pasien di luar rentang entri, atau red flag tercentang → saran TIDAK tampil; arahkan ke Konsul.
5. Hanya kasus ringan–sedang yang boleh ada di protokol. Klasifikasi berat tidak dibuatkan entri — selalu rujuk/konsul.
6. Setiap tampilan saran wajib menampilkan: nama obat, sediaan + konsentrasi, takaran, frekuensi, durasi, peringatan, dan red flag entri tersebut. Tidak ada saran "setengah".

## 3. Penempatan & navigasi

- Menu sidebar baru: **"Protokol Obat"**, di kelompok klinis tepat **di bawah menu Pelayanan**. Ikon: pil / buku catatan (ikuti pustaka ikon yang sudah dipakai project).
- Route: `app/[lang]/dashboard/protokol-obat/page.tsx` (ikuti pola route dashboard yang ada).
- Untuk role OWNER, menu menampilkan **badge angka** = jumlah konsul berstatus MENUNGGU.
- Layout desktop-first (staff bekerja dari monitor), tetap responsif untuk HP.

## 4. Peran & hak akses

| Kemampuan | STAFF | OWNER (Bidan Nina) |
|---|---|---|
| Cari & lihat saran protokol tervalidasi | ✅ | ✅ |
| Kirim Konsul | ✅ | ✅ |
| Lihat antrean Konsul + menjawab | ❌ | ✅ |
| Tambah/edit entri protokol | ❌ | ✅ |
| Mengesahkan (validasi) entri DRAF | ❌ | ✅ |
| Melihat entri DRAF sebagai saran | ❌ | ✅ (ditandai jelas "DRAF") |

Pola pembatasan mengikuti cara project membatasi menu/fitur per role yang sudah ada (mis. kategori keuangan yang disembunyikan untuk staff) + RLS Supabase per tabel baru.

## 5. Halaman Protokol Obat — anatomi

Satu halaman, tiga tab (tab 2 & 3 hanya OWNER):

### Tab 1 — "Cari Protokol" (semua role)
1. **Kolom pencarian diagnosa** (besar, autofocus): pencocokan toleran terhadap variasi tulisan — data nyata TPMB punya ±993 variasi ejaan diagnosa (contoh: PARATYPOID / PARATIPOID / PARATHYPOID = diagnosa sama; KBSUNTIK; BAPILNAS). Pencarian memakai tabel alias (§6.2) + pencocokan substring ternormalisasi (huruf besar, tanpa spasi ganda, tanpa tanda baca).
2. **Form konteks pasien**: usia (angka + satuan TH/BLN/HARI, mengikuti format `patient_age` yang sudah dipakai project), berat badan (kg), status hamil (ya/tidak — tampil bila relevan), alergi obat (teks bebas / "tidak ada"), checklist red flag ringkas per diagnosa terpilih.
3. **Kartu hasil** (hanya bila ada entri TERVALIDASI yang rentang usia & BB-nya mencakup pasien DAN tidak ada red flag tercentang DAN tidak ada kontraindikasi dari isian alergi/status hamil): tampilkan per obat — nama generik/merk stok, sediaan + konsentrasi, **takaran terhitung** (§7), frekuensi, durasi, dosis maksimum, peringatan, catatan Bidan Nina.
4. **Keadaan tanpa hasil**: pesan jelas "Diagnosa ini belum ada protokol tervalidasi" + tombol **"Konsul ke Bidan Nina"** yang membuka form Konsul dengan konteks pasien yang sudah terisi ikut terkirim.

### Tab 2 — "Kelola Protokol" (OWNER)
- Tabel daftar entri: diagnosa baku, kelompok pasien, rentang usia, rentang BB, obat, status, aksi (edit / sahkan / nonaktifkan).
- **Form "Tambah Protokol"** (juga dipakai untuk edit) — Bidan Nina mengisi sendiri pakemnya dengan bahasa sederhana, tanpa istilah teknis sistem:
  - Diagnosa (nama baku) + kolom "tulisan lain yang biasa dipakai" (alias, boleh banyak, pisahkan koma)
  - Kelompok pasien (bayi / balita / anak / dewasa / ibu hamil / ibu menyusui)
  - Rentang usia (dari–sampai + satuan) dan rentang berat badan (kg dari–sampai) — BB adalah parameter utama, usia penyaring
  - Obat: nama, bentuk sediaan, konsentrasi persis sediaan yang distok (mis. "125 mg/5 ml")
  - Dosis acuan (mg/kgBB/kali) bila berbasis BB, atau takaran tetap per kali
  - Satuan takaran hasil (ml / tablet / kapsul / tetes), frekuensi, durasi, dosis maksimum
  - Syarat wajib, kontraindikasi/perhatian (termasuk alergi & kehamilan), red flag (satu per baris)
  - Catatan bebas Bidan Nina
- Entri yang dibuat langsung oleh OWNER tersimpan sebagai `TERVALIDASI` (beliau sumber kewenangannya). Entri hasil impor/analisis data masuk sebagai `DRAF` dan butuh aksi "Sahkan" beliau. Setiap pengesahan mencatat `validated_by` + `validated_at` — kumpulan entri tervalidasi ini diperlakukan sebagai protap tertulis internal praktik.

### Tab 3 — "Konsul" (OWNER) + riwayat konsul staff
- Antrean konsul berstatus MENUNGGU di atas: nama pasien (atau inisial sesuai data yang dikirim staff), diagnosa yang dicari, konteks pasien, catatan anamnesa staff, waktu kirim, nama staff pengirim.
- Aksi OWNER pada satu konsul: **Jawab** (teks jawaban: nama obat + takaran + catatan), centang opsional **"Simpan jawaban ini sebagai protokol"** → membuat entri protokol baru (status TERVALIDASI) yang isian awalnya diambil dari konsul + jawaban, Bidan Nina melengkapi sisanya di form yang sama. Setelah dijawab, status konsul = TERJAWAB dan staff pengirim bisa melihat jawabannya di riwayat konsul miliknya.
- Staff melihat daftar konsul yang dia kirim + status + jawaban (read-only).

## 6. Model data (Supabase — tabel baru, semua dengan RLS)

### 6.1 `protocol_entries`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| diagnosis_name | text | nama baku, tampil uppercase |
| patient_group | text | enum bebas terkontrol: BAYI/BALITA/ANAK/DEWASA/BUMIL/BUSUI |
| age_min_value / age_max_value | numeric | + `age_unit` text (HARI/BLN/TH); nullable = tak dibatasi |
| weight_min_kg / weight_max_kg | numeric | nullable = tak dibatasi |
| medicine_name | text | nama obat (generik/merk stok) |
| dosage_form | text | sirup / tablet / kapsul / tetes / salep / injeksi, dll |
| concentration | text | mis. "125 mg/5 ml" — wajib untuk sediaan cair |
| dose_mg_per_kg | numeric | dosis acuan berbasis BB; nullable |
| dose_fixed_amount | numeric | takaran tetap per kali bila tidak berbasis BB; nullable |
| dose_unit | text | ml / tablet / kapsul / tetes / mg |
| frequency | text | mis. "3 x sehari" |
| duration | text | mis. "3 hari" |
| max_dose | text | dosis maksimum (teks terstruktur sederhana) |
| requirements | text | syarat wajib sebelum saran berlaku |
| contraindications | text | kontraindikasi & perhatian (alergi, hamil, dll) |
| red_flags | text[] | daftar tanda bahaya; satu item per elemen |
| owner_notes | text | catatan Bidan Nina |
| status | text | DRAF / TERVALIDASI / NONAKTIF |
| validated_by / validated_at | text / timestamptz | jejak pengesahan |
| created_by | text | nama/role pembuat (OWNER manual / IMPOR DATA) |
| created_at / updated_at | timestamptz | |

Satu diagnosa baku boleh punya banyak baris (beda kelompok pasien / beda obat).

### 6.2 `protocol_diagnosis_aliases`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| protocol_diagnosis_name | text | merujuk nama baku di 6.1 (teks, bukan FK kaku) |
| alias | text | satu variasi tulisan, disimpan ternormalisasi (uppercase, spasi tunggal) |

Diisi dari: (a) kolom alias pada form Tambah Protokol, (b) impor hasil analisis data (993 variasi dari `medical_records.diagnosis` dikelompokkan ke diagnosa baku — daftar awal disiapkan terpisah, bukan oleh prompt implementasi).

### 6.3 `protocol_consultations` (Konsul)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| created_at | timestamptz | waktu kirim |
| staff_name | text | pengirim |
| patient_name | text | sesuai isian staff |
| patient_age | text | format sama seperti `medical_records.patient_age` |
| weight | numeric | kg, nullable |
| diagnosis_query | text | diagnosa yang dicari staff |
| anamnesis_notes | text | catatan anamnesa (pengganti kertas) |
| context | jsonb | status hamil, alergi, red flag tercentang |
| status | text | MENUNGGU / TERJAWAB |
| answer_text | text | jawaban Bidan Nina |
| answered_by / answered_at | text / timestamptz | |
| saved_as_protocol | boolean | apakah jawaban disimpan jadi entri protokol |

## 7. Aturan hitung takaran (deterministik, tanpa AI)

1. Cocokkan diagnosa → ambil entri TERVALIDASI untuk diagnosa itu.
2. Saring entri: kelompok pasien cocok DAN usia pasien dalam rentang usia entri AND BB pasien dalam rentang BB entri. Di luar rentang → entri gugur.
3. Bila `dose_mg_per_kg` terisi: dosis mg = `dose_mg_per_kg` × BB pasien; cek tidak melewati `max_dose`. Untuk sediaan cair: takaran ml = dosis mg ÷ konsentrasi (mg/ml dari kolom `concentration`); bulatkan ke 0,5 ml terdekat dan tampilkan juga hasil mentahnya. Bila konsentrasi tidak bisa diparse → tampilkan dosis dalam mg saja + peringatan konsentrasi belum terisi.
4. Bila `dose_fixed_amount` terisi: tampilkan apa adanya dalam `dose_unit`.
5. Fungsi hitung ditulis murni (pure function) di `lib/` (mis. `lib/protokolDosis.ts`) agar bisa diuji terpisah, dan dipakai hanya oleh komponen kartu hasil.

Dasar teori (untuk pemahaman, bukan untuk diubah jadi angka oleh implementor): hierarki ketepatan dosis anak = luas permukaan tubuh > berat badan > usia; karena itu BB parameter utama. Rumus klasik (Young/Dilling/Fried/Clark) TIDAK dipakai menghitung — hanya pengetahuan latar.

## 8. Data awal (seed) — di luar prompt implementasi kode

- Daftar kandidat diagnosa gelombang pertama dari analisis 6.998 record `medical_records` (Feb–Okt 2026): ISPA (pisahkan anak vs dewasa), PARATYPOID, GASTRITIS, FARINGITIS, GEA, VOMITING, GATAL-GATAL + layanan KB SUNTIK. Status semua `DRAF`, kolom dosis dikosongkan untuk diisi/disahkan Bidan Nina.
- Pola item obat per diagnosa dari data hanya dipakai sebagai *petunjuk awal* saat beliau mengisi — bukan sebagai isi final.

## 9. Fase implementasi (prompt akan merujuk fase ini satu per satu)

- **Fase 1 — Fondasi**: migrasi 3 tabel + RLS; menu sidebar + badge (badge boleh statis 0 dulu); halaman + Tab 1 pencarian (pencocokan alias sederhana) + kartu hasil memakai aturan §7; Tab 2 Kelola Protokol (CRUD + form Tambah Protokol + aksi Sahkan). Tanpa Konsul dulu.
- **Fase 2 — Konsul**: Tab 3 + form Konsul dari Tab 1 (keadaan tanpa hasil) + badge sidebar aktif (hitung MENUNGGU) + alur jawab + "simpan sebagai protokol".
- **Fase 3 — Integrasi & kebiasaan baru (nanti, setelah Fase 1–2 terbukti dipakai)**: tombol "Cek Protokol" di form Pelayanan yang menarik diagnosa/usia/BB otomatis; mode catatan anamnesa cepat di HP untuk staff (pengganti kertas penuh); impor alias massal dari data pelayanan.

Jangan mengerjakan fase di luar yang dirujuk prompt berjalan. Jangan mengubah perilaku halaman/fitur yang sudah stabil (Pelayanan, Keuangan, dsb.) selain menambahkan menu sidebar baru.

## 10. Kriteria penerimaan per fase (ringkas)

- Fase 1: OWNER bisa menambah entri lewat form dan entri langsung TERVALIDASI; entri DRAF tidak pernah tampil sebagai saran ke STAFF; pencarian "paratiopid" menemukan diagnosa baku PARATYPOID; pasien di luar rentang BB entri tidak mendapat saran; hitung takaran contoh terverifikasi manual (dosis mg/kgBB × BB ÷ konsentrasi = ml).
- Fase 2: STAFF mengirim konsul dari keadaan tanpa hasil; OWNER melihat badge bertambah; jawaban OWNER tersimpan, terlihat oleh staff pengirim, dan opsi simpan-sebagai-protokol membuat entri TERVALIDASI baru.
- Semua fase: tidak ada regresi di halaman lain; build lolos; teks UI Bahasa Indonesia.
