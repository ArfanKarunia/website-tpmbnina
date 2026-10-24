-- ==============================================================================
-- Migration: create_protokol_obat_tables
-- Fitur: Protokol Obat (Clinical Decision Support berbasis protokol tervalidasi)
-- Dokumen Acuan: docs/protokol_obat_architecture.md (§6 & §2)
-- ==============================================================================

-- 1. Helper Function: trigger otomatis update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. Tabel protocol_entries (§6.1)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.protocol_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_name TEXT NOT NULL,
    patient_group TEXT NOT NULL,
    age_min_value NUMERIC,
    age_max_value NUMERIC,
    age_unit TEXT,
    weight_min_kg NUMERIC,
    weight_max_kg NUMERIC,
    medicine_name TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    concentration TEXT,
    dose_mg_per_kg NUMERIC,
    dose_fixed_amount NUMERIC,
    dose_unit TEXT,
    frequency TEXT,
    duration TEXT,
    max_dose TEXT,
    requirements TEXT,
    contraindications TEXT,
    red_flags TEXT[],
    owner_notes TEXT,
    status TEXT NOT NULL DEFAULT 'DRAF' CHECK (status IN ('DRAF', 'TERVALIDASI', 'NONAKTIF')),
    validated_by TEXT,
    validated_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index protocol_entries
CREATE INDEX IF NOT EXISTS idx_protocol_entries_status ON public.protocol_entries (status);
CREATE INDEX IF NOT EXISTS idx_protocol_entries_diagnosis_name ON public.protocol_entries (diagnosis_name);

-- Trigger updated_at protocol_entries
CREATE TRIGGER trg_protocol_entries_updated_at
    BEFORE UPDATE ON public.protocol_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 3. Tabel protocol_diagnosis_aliases (§6.2)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.protocol_diagnosis_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_diagnosis_name TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index protocol_diagnosis_aliases (UNIQUE pada alias)
CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_diagnosis_aliases_alias ON public.protocol_diagnosis_aliases (alias);

-- ==============================================================================
-- 4. Tabel protocol_consultations (§6.3)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.protocol_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    staff_name TEXT NOT NULL,
    patient_name TEXT,
    patient_age TEXT,
    weight NUMERIC,
    diagnosis_query TEXT NOT NULL,
    anamnesis_notes TEXT,
    context JSONB,
    status TEXT NOT NULL DEFAULT 'MENUNGGU' CHECK (status IN ('MENUNGGU', 'TERJAWAB')),
    answer_text TEXT,
    answered_by TEXT,
    answered_at TIMESTAMPTZ,
    saved_as_protocol BOOLEAN DEFAULT false
);

-- Index protocol_consultations
CREATE INDEX IF NOT EXISTS idx_protocol_consultations_status_created_at ON public.protocol_consultations (status, created_at);

-- Trigger updated_at protocol_consultations
CREATE TRIGGER trg_protocol_consultations_updated_at
    BEFORE UPDATE ON public.protocol_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Row Level Security (RLS) & Policies
-- ==============================================================================

-- A. protocol_entries
ALTER TABLE public.protocol_entries ENABLE ROW LEVEL SECURITY;

-- Catatan Keamanan:
-- Pembatasan hak tulis (INSERT/UPDATE/DELETE) khusus role OWNER ditegakkan di lapisan aplikasi
-- pada fase ini, mengikuti pola role-based access control yang sudah berjalan pada project.
CREATE POLICY "Allow authenticated read on protocol_entries"
    ON public.protocol_entries FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on protocol_entries"
    ON public.protocol_entries FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on protocol_entries"
    ON public.protocol_entries FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on protocol_entries"
    ON public.protocol_entries FOR DELETE TO authenticated
    USING (true);

-- B. protocol_diagnosis_aliases
ALTER TABLE public.protocol_diagnosis_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on protocol_diagnosis_aliases"
    ON public.protocol_diagnosis_aliases FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on protocol_diagnosis_aliases"
    ON public.protocol_diagnosis_aliases FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on protocol_diagnosis_aliases"
    ON public.protocol_diagnosis_aliases FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on protocol_diagnosis_aliases"
    ON public.protocol_diagnosis_aliases FOR DELETE TO authenticated
    USING (true);

-- C. protocol_consultations
-- Catatan: TIDAK ADA policy DELETE karena riwayat konsul tidak boleh dihapus
ALTER TABLE public.protocol_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on protocol_consultations"
    ON public.protocol_consultations FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on protocol_consultations"
    ON public.protocol_consultations FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on protocol_consultations"
    ON public.protocol_consultations FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

