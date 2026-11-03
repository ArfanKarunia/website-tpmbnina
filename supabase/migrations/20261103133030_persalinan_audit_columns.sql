-- Migration: persalinan_audit_columns
-- Menambahkan kolom audit pada tabel persalinan
alter table public.persalinan add column if not exists diperbarui_oleh text null;
alter table public.persalinan add column if not exists diperbarui_pada timestamptz null;

