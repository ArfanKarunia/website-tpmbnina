-- ==============================================================================
-- Migration: persalinan_tables
-- Modul: Persalinan & Bayi Baru Lahir (BBL) TPMB Nina Rahayu
-- ==============================================================================

-- 1. Tabel persalinan (Kejadian persalinan ibu)
create table if not exists public.persalinan (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  medical_record_id uuid references public.medical_records(id),
  hpht_snapshot date null,
  delivery_datetime timestamptz not null,
  tempat text not null check (tempat in ('TPMB','LUAR')),
  tempat_luar_nama text null,
  normal boolean not null default false,
  rujuk boolean not null default false,
  tujuan_rujuk text null,
  staff_name text null,
  keterangan text null,
  created_at timestamptz not null default now()
);

-- 2. Tabel persalinan_bayi (Data bayi baru lahir per kejadian persalinan)
create table if not exists public.persalinan_bayi (
  id uuid primary key default gen_random_uuid(),
  persalinan_id uuid not null references public.persalinan(id) on delete cascade,
  nama_bayi text not null,
  jenis_kelamin text not null check (jenis_kelamin in ('L','P')),
  bbl_gram numeric null,
  pbl_cm numeric null,
  lk_cm numeric null,
  ld_cm numeric null,
  spo2_tangan_kanan numeric null,
  spo2_kaki numeric null,
  skrining_shk text null check (skrining_shk in ('YA','TIDAK')),
  diperbarui_oleh text null,
  diperbarui_pada timestamptz null,
  created_at timestamptz not null default now()
);

-- Indexing untuk performa kueri dan relasi FK
create index if not exists idx_persalinan_patient_id on public.persalinan(patient_id);
create index if not exists idx_persalinan_delivery_datetime on public.persalinan(delivery_datetime);
create index if not exists idx_persalinan_bayi_persalinan_id on public.persalinan_bayi(persalinan_id);

-- 3. Row Level Security (RLS) mengikuti pola tabel patients dan medical_records
alter table public.persalinan enable row level security;
alter table public.persalinan_bayi enable row level security;

create policy "Staff bisa melakukan segalanya di persalinan"
  on public.persalinan for all to authenticated
  using (true) with check (true);

create policy "Staff bisa melakukan segalanya di persalinan_bayi"
  on public.persalinan_bayi for all to authenticated
  using (true) with check (true);

create policy "Enable all access for all users on persalinan"
  on public.persalinan for all to public
  using (true) with check (true);

create policy "Enable all access for all users on persalinan_bayi"
  on public.persalinan_bayi for all to public
  using (true) with check (true);

