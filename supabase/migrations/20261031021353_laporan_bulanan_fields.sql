alter table public.medical_records add column if not exists height_cm numeric null;
alter table public.medical_records add column if not exists lp_cm numeric null;
alter table public.medical_records add column if not exists lila_cm numeric null;
alter table public.medical_records add column if not exists gds numeric null;
alter table public.medical_records add column if not exists tt_status text null;
alter table public.medical_records add column if not exists jumlah_anak integer null;
alter table public.medical_records add column if not exists anak_terakhir text null;

