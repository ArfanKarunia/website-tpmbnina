"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, 
  Pill, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Info, 
  Scale, 
  User, 
  Sparkles,
  Lock,
  Plus,
  Pencil,
  Ban,
  Check,
  X,
  RefreshCw,
  Filter,
  CheckCircle,
  MessageSquare,
  Send,
  ArrowRight
} from "lucide-react";
import {
  ProtocolEntry,
  DiagnosisAlias,
  normalizeDiagnosisText,
  findProtocolDiagnosis,
  parsePatientAge,
  filterEntriesByContext,
  computeDose,
  DoseCalculationResult
} from "@/lib/protokolDosis";

// Tipe Data untuk Tabel protocol_consultations (§6.3)
export interface ProtocolConsultation {
  id: string;
  created_at: string;
  updated_at: string;
  staff_name: string;
  patient_name?: string | null;
  patient_age?: string | null;
  weight?: number | null;
  diagnosis_query: string;
  anamnesis_notes?: string | null;
  context?: {
    isPregnant?: boolean;
    allergies?: string;
    redFlags?: string[];
  } | null;
  status: "MENUNGGU" | "TERJAWAB";
  answer_text?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  saved_as_protocol?: boolean | null;
}

export default function ProtokolObatPage() {
  const supabase = createClient();

  // Role user & Profil
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Bidan Nina (Owner)");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // Navigasi Tab (Tab 1: Cari Protokol, Tab 2: Kelola Protokol, Tab 3: Konsul)
  const [activeTab, setActiveTab] = useState<"cari" | "kelola" | "konsul">("cari");

  // State data dari Supabase
  const [aliases, setAliases] = useState<DiagnosisAlias[]>([]);
  const [entries, setEntries] = useState<ProtocolEntry[]>([]);
  const [consultations, setConsultations] = useState<ProtocolConsultation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form Pencarian Diagnosa (Autofocus Tab 1)
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form Konteks Pasien (Tab 1)
  const [ageValue, setAgeValue] = useState<string>("");
  const [ageUnit, setAgeUnit] = useState<"TH" | "BLN" | "HARI">("TH");
  const [weightKg, setWeightKg] = useState<string>("");
  const [isPregnant, setIsPregnant] = useState<"tidak" | "ya">("tidak");
  const [allergies, setAllergies] = useState<string>("");
  const [checkedRedFlags, setCheckedRedFlags] = useState<string[]>([]);

  // =========================================================================
  // STATE MODAL KIRIM KONSUL (TAB 1 KE TAB 3)
  // =========================================================================
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultPatientName, setConsultPatientName] = useState("");
  const [consultAnamnesis, setConsultAnamnesis] = useState("");
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);
  const [consultSuccessMessage, setConsultSuccessMessage] = useState<string | null>(null);

  // =========================================================================
  // STATE KHUSUS TAB 2: KELOLA PROTOKOL (OWNER ONLY)
  // =========================================================================
  const formCardRef = useRef<HTMLDivElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Filter & Search di Tabel Tab 2
  const [manageSearchTerm, setManageSearchTerm] = useState("");
  const [manageStatusFilter, setManageStatusFilter] = useState<"SEMUA" | "TERVALIDASI" | "DRAF" | "NONAKTIF">("SEMUA");

  // Field Form Tambah / Edit Protokol
  const [formDiagnosisName, setFormDiagnosisName] = useState("");
  const [formAliases, setFormAliases] = useState("");
  const [formPatientGroup, setFormPatientGroup] = useState<string>("ANAK");
  const [formAgeMin, setFormAgeMin] = useState("");
  const [formAgeMax, setFormAgeMax] = useState("");
  const [formAgeUnit, setFormAgeUnit] = useState<"TH" | "BLN" | "HARI">("TH");
  const [formWeightMin, setFormWeightMin] = useState("");
  const [formWeightMax, setFormWeightMax] = useState("");
  const [formMedicineName, setFormMedicineName] = useState("");
  const [formDosageForm, setFormDosageForm] = useState("Sirup");
  const [formConcentration, setFormConcentration] = useState("");
  const [formDoseMgPerKg, setFormDoseMgPerKg] = useState("");
  const [formDoseFixed, setFormDoseFixed] = useState("");
  const [formDoseUnit, setFormDoseUnit] = useState("ml");
  const [formFrequency, setFormFrequency] = useState("3x sehari");
  const [formDuration, setFormDuration] = useState("3 hari");
  const [formMaxDose, setFormMaxDose] = useState("");
  const [formRequirements, setFormRequirements] = useState("");
  const [formContraindications, setFormContraindications] = useState("");
  const [formRedFlags, setFormRedFlags] = useState("");
  const [formOwnerNotes, setFormOwnerNotes] = useState("");

  // =========================================================================
  // STATE KHUSUS TAB 3: KONSUL (JAWABAN OWNER)
  // =========================================================================
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [saveAsProtocolFlags, setSaveAsProtocolFlags] = useState<Record<string, boolean>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // 1. Ambil role user & profil saat halaman dimuat
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const { data } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", user.id)
          .single();
        if (data) {
          setUserRole(data.role);
          if (data.name) setUserName(data.name);
        }
      }
      setIsRoleLoading(false);
    };
    fetchUserRole();
  }, [supabase]);

  // Guardrail: bila role bukan owner, jangan biarkan activeTab === "kelola"
  useEffect(() => {
    if (userRole && userRole !== "owner" && activeTab === "kelola") {
      setActiveTab("cari");
    }
  }, [userRole, activeTab]);

  // 2. Autofocus input pencarian saat tab cari aktif
  useEffect(() => {
    if (activeTab === "cari" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  // 3. Fetch & Refetch data aliases, protocol_entries, dan protocol_consultations
  const refetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // A. Ambil alias diagnosa
      const { data: aliasesData } = await supabase
        .from("protocol_diagnosis_aliases")
        .select("alias, protocol_diagnosis_name");

      if (aliasesData) {
        setAliases(
          aliasesData.map((item) => ({
            alias: item.alias,
            diagnosis_name: item.protocol_diagnosis_name,
          }))
        );
      }

      // B. Ambil entri protokol
      const { data: entriesData } = await supabase
        .from("protocol_entries")
        .select("*")
        .order("diagnosis_name", { ascending: true })
        .order("created_at", { ascending: false });

      if (entriesData) {
        setEntries(entriesData as ProtocolEntry[]);
      }

      // C. Ambil daftar konsultasi
      const { data: consultsData } = await supabase
        .from("protocol_consultations")
        .select("*")
        .order("created_at", { ascending: false });

      if (consultsData) {
        setConsultations(consultsData as ProtocolConsultation[]);
      }
    } catch (err) {
      console.error("Gagal memuat data protokol obat:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [supabase]);

  useEffect(() => {
    refetchData();
  }, [refetchData]);

  // =========================================================================
  // LOGIKA TAB 1 (Pencarian & CDS)
  // =========================================================================
  const matchedDiagnosis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return findProtocolDiagnosis(searchQuery, aliases);
  }, [searchQuery, aliases]);

  const candidateEntries = useMemo(() => {
    if (!matchedDiagnosis) return [];

    return entries.filter((entry) => {
      const isSameDiagnosis =
        normalizeDiagnosisText(entry.diagnosis_name) ===
        normalizeDiagnosisText(matchedDiagnosis);

      if (!isSameDiagnosis) return false;

      if (userRole === "owner") {
        return entry.status === "TERVALIDASI" || entry.status === "DRAF";
      }
      // Staff HANYA TERVALIDASI
      return entry.status === "TERVALIDASI";
    });
  }, [matchedDiagnosis, entries, userRole]);

  const allAvailableRedFlags = useMemo(() => {
    const setFlags = new Set<string>();
    candidateEntries.forEach((entry) => {
      if (Array.isArray(entry.red_flags)) {
        entry.red_flags.forEach((flag) => {
          if (flag && flag.trim()) setFlags.add(flag.trim());
        });
      }
    });
    return Array.from(setFlags);
  }, [candidateEntries]);

  useEffect(() => {
    setCheckedRedFlags([]);
  }, [matchedDiagnosis]);

  const toggleRedFlag = (flag: string) => {
    setCheckedRedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const parsedAgeDays = useMemo(() => {
    if (!ageValue.trim()) return null;
    return parsePatientAge(`${ageValue} ${ageUnit}`);
  }, [ageValue, ageUnit]);

  const parsedWeightKg = useMemo(() => {
    if (!weightKg.trim()) return null;
    const w = parseFloat(weightKg.replace(",", "."));
    return isNaN(w) ? null : w;
  }, [weightKg]);

  const eligibleEntries = useMemo(() => {
    if (candidateEntries.length === 0) return [];
    return filterEntriesByContext(candidateEntries, {
      ageDays: parsedAgeDays,
      weightKg: parsedWeightKg,
    });
  }, [candidateEntries, parsedAgeDays, parsedWeightKg]);

  const hasRedFlagTriggered = checkedRedFlags.length > 0;

  // Buka Modal Konsul dengan Konteks Tab 1
  const openConsultModal = () => {
    setConsultPatientName("");
    setConsultAnamnesis("");
    setConsultSuccessMessage(null);
    setIsConsultModalOpen(true);
  };

  // Submit Kirim Konsul Baru (Staff)
  const handleSendConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultAnamnesis.trim()) {
      alert("Catatan anamnesa wajib diisi!");
      return;
    }

    setIsSubmittingConsult(true);
    try {
      const activeDiagnosisQuery = (matchedDiagnosis || searchQuery).trim();
      const patientAgeStr = ageValue.trim() ? `${ageValue} ${ageUnit}` : null;

      const payload = {
        staff_name: userName || "Staff",
        patient_name: consultPatientName.trim() || null,
        patient_age: patientAgeStr,
        weight: parsedWeightKg,
        diagnosis_query: activeDiagnosisQuery,
        anamnesis_notes: consultAnamnesis.trim(),
        context: {
          isPregnant: isPregnant === "ya",
          allergies: allergies.trim() || "Tidak ada",
          redFlags: checkedRedFlags,
        },
        status: "MENUNGGU",
      };

      const { error } = await supabase
        .from("protocol_consultations")
        .insert([payload]);

      if (error) throw error;

      await refetchData();
      setConsultSuccessMessage("Konsul berhasil dikirim ke Bidan Nina! Anda dapat memantau jawaban di Tab Konsul.");

      // Kosongkan form dan tutup modal setelah jeda singkat
      setTimeout(() => {
        setIsConsultModalOpen(false);
        setConsultPatientName("");
        setConsultAnamnesis("");
        setConsultSuccessMessage(null);
      }, 1500);

    } catch (err: any) {
      console.error("Gagal mengirim konsul:", err);
      alert("Gagal mengirim konsul: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSubmittingConsult(false);
    }
  };

  // =========================================================================
  // LOGIKA TAB 2: KELOLA PROTOKOL (CRUD & AKSI OWNER)
  // =========================================================================

  // Buka Form Baru
  const openNewForm = () => {
    setEditingEntryId(null);
    setFormDiagnosisName("");
    setFormAliases("");
    setFormPatientGroup("ANAK");
    setFormAgeMin("");
    setFormAgeMax("");
    setFormAgeUnit("TH");
    setFormWeightMin("");
    setFormWeightMax("");
    setFormMedicineName("");
    setFormDosageForm("Sirup");
    setFormConcentration("");
    setFormDoseMgPerKg("");
    setFormDoseFixed("");
    setFormDoseUnit("ml");
    setFormFrequency("3x sehari");
    setFormDuration("3 hari");
    setFormMaxDose("");
    setFormRequirements("");
    setFormContraindications("");
    setFormRedFlags("");
    setFormOwnerNotes("");
    setFormError(null);
    setFormSuccessMessage(null);
    setIsFormOpen(true);

    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Buka Form Edit dengan Data Terisi
  const openEditForm = (entry: ProtocolEntry) => {
    setEditingEntryId(entry.id || null);
    setFormDiagnosisName(entry.diagnosis_name || "");

    const existingAliases = aliases
      .filter(
        (a) =>
          normalizeDiagnosisText(a.diagnosis_name) ===
          normalizeDiagnosisText(entry.diagnosis_name)
      )
      .map((a) => a.alias);
    setFormAliases(existingAliases.join(", "));

    setFormPatientGroup(entry.patient_group || "ANAK");
    setFormAgeMin(
      entry.age_min_value !== null && entry.age_min_value !== undefined
        ? String(entry.age_min_value)
        : ""
    );
    setFormAgeMax(
      entry.age_max_value !== null && entry.age_max_value !== undefined
        ? String(entry.age_max_value)
        : ""
    );
    setFormAgeUnit((entry.age_unit as "TH" | "BLN" | "HARI") || "TH");
    setFormWeightMin(
      entry.weight_min_kg !== null && entry.weight_min_kg !== undefined
        ? String(entry.weight_min_kg)
        : ""
    );
    setFormWeightMax(
      entry.weight_max_kg !== null && entry.weight_max_kg !== undefined
        ? String(entry.weight_max_kg)
        : ""
    );
    setFormMedicineName(entry.medicine_name || "");
    setFormDosageForm(entry.dosage_form || "Sirup");
    setFormConcentration(entry.concentration || "");
    setFormDoseMgPerKg(
      entry.dose_mg_per_kg !== null && entry.dose_mg_per_kg !== undefined
        ? String(entry.dose_mg_per_kg)
        : ""
    );
    setFormDoseFixed(
      entry.dose_fixed_amount !== null && entry.dose_fixed_amount !== undefined
        ? String(entry.dose_fixed_amount)
        : ""
    );
    setFormDoseUnit(entry.dose_unit || "ml");
    setFormFrequency(entry.frequency || "3x sehari");
    setFormDuration(entry.duration || "3 hari");
    setFormMaxDose(entry.max_dose || "");
    setFormRequirements(entry.requirements || "");
    setFormContraindications(entry.contraindications || "");
    setFormRedFlags(
      Array.isArray(entry.red_flags) ? entry.red_flags.join("\n") : ""
    );
    setFormOwnerNotes(entry.owner_notes || "");
    setFormError(null);
    setFormSuccessMessage(null);
    setIsFormOpen(true);

    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Simpan Form (Tambah Baru / Update)
  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    if (!formDiagnosisName.trim()) {
      setFormError("Nama diagnosa baku wajib diisi!");
      return;
    }
    if (!formMedicineName.trim()) {
      setFormError("Nama obat wajib diisi!");
      return;
    }
    if (!formDosageForm.trim()) {
      setFormError("Bentuk sediaan wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const standardDiagnosis = formDiagnosisName.trim().toUpperCase();

      const basePayload: any = {
        diagnosis_name: standardDiagnosis,
        patient_group: formPatientGroup,
        age_min_value: formAgeMin.trim() ? parseFloat(formAgeMin) : null,
        age_max_value: formAgeMax.trim() ? parseFloat(formAgeMax) : null,
        age_unit: (formAgeMin.trim() || formAgeMax.trim()) ? formAgeUnit : null,
        weight_min_kg: formWeightMin.trim() ? parseFloat(formWeightMin.replace(",", ".")) : null,
        weight_max_kg: formWeightMax.trim() ? parseFloat(formWeightMax.replace(",", ".")) : null,
        medicine_name: formMedicineName.trim(),
        dosage_form: formDosageForm.trim(),
        concentration: formConcentration.trim() || null,
        dose_mg_per_kg: formDoseMgPerKg.trim() ? parseFloat(formDoseMgPerKg.replace(",", ".")) : null,
        dose_fixed_amount: formDoseFixed.trim() ? parseFloat(formDoseFixed.replace(",", ".")) : null,
        dose_unit: formDoseUnit.trim() || null,
        frequency: formFrequency.trim() || null,
        duration: formDuration.trim() || null,
        max_dose: formMaxDose.trim() || null,
        requirements: formRequirements.trim() || null,
        contraindications: formContraindications.trim() || null,
        red_flags: formRedFlags
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        owner_notes: formOwnerNotes.trim() || null,
      };

      if (editingEntryId) {
        const { error: updateError } = await supabase
          .from("protocol_entries")
          .update(basePayload)
          .eq("id", editingEntryId);

        if (updateError) throw updateError;
      } else {
        basePayload.status = "TERVALIDASI";
        basePayload.validated_by = userName || "Bidan Nina (Owner)";
        basePayload.validated_at = nowIso;
        basePayload.created_by = userName || "Bidan Nina (Owner)";

        const { error: insertError } = await supabase
          .from("protocol_entries")
          .insert([basePayload]);

        if (insertError) throw insertError;
      }

      // Simpan Alias Baru (Normalisasi & Hindari Duplikat)
      if (formAliases.trim()) {
        const rawAliases = formAliases.split(",").map((a) => a.trim()).filter(Boolean);
        const normalizedAliases = Array.from(
          new Set(rawAliases.map((a) => normalizeDiagnosisText(a)).filter(Boolean))
        );

        if (normalizedAliases.length > 0) {
          const { data: existingDbAliases } = await supabase
            .from("protocol_diagnosis_aliases")
            .select("alias")
            .in("alias", normalizedAliases);

          const existingSet = new Set((existingDbAliases || []).map((row) => row.alias));
          const newAliasRows = normalizedAliases
            .filter((a) => !existingSet.has(a))
            .map((a) => ({
              protocol_diagnosis_name: standardDiagnosis,
              alias: a,
            }));

          if (newAliasRows.length > 0) {
            const { error: aliasError } = await supabase
              .from("protocol_diagnosis_aliases")
              .insert(newAliasRows);

            if (aliasError) {
              console.warn("Peringatan saat menyimpan alias:", aliasError.message);
            }
          }
        }
      }

      await refetchData();

      setFormSuccessMessage(
        editingEntryId
          ? "Protokol berhasil diperbarui!"
          : "Protokol baru berhasil ditambahkan dan berstatus TERVALIDASI."
      );

      setTimeout(() => {
        setIsFormOpen(false);
        setEditingEntryId(null);
        setFormSuccessMessage(null);
      }, 1200);

    } catch (err: any) {
      console.error("Gagal menyimpan protokol obat:", err);
      setFormError(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aksi Sahkan (Khusus DRAF -> TERVALIDASI)
  const handleValidateEntry = async (entry: ProtocolEntry) => {
    if (!entry.id) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("protocol_entries")
        .update({
          status: "TERVALIDASI",
          validated_by: userName || "Bidan Nina (Owner)",
          validated_at: nowIso,
        })
        .eq("id", entry.id);

      if (error) throw error;
      await refetchData();
    } catch (err: any) {
      console.error("Gagal mengesahkan entri:", err);
      alert("Gagal mengesahkan entri: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aksi Nonaktifkan
  const handleDeactivateEntry = async (entry: ProtocolEntry) => {
    if (!entry.id) return;
    if (!window.confirm(`Nonaktifkan protokol "${entry.medicine_name}" untuk diagnosa ${entry.diagnosis_name}?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("protocol_entries")
        .update({
          status: "NONAKTIF",
        })
        .eq("id", entry.id);

      if (error) throw error;
      await refetchData();
    } catch (err: any) {
      console.error("Gagal menonaktifkan entri:", err);
      alert("Gagal menonaktifkan entri: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aksi Aktifkan Kembali
  const handleReactivateEntry = async (entry: ProtocolEntry) => {
    if (!entry.id) return;
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("protocol_entries")
        .update({
          status: "TERVALIDASI",
          validated_by: userName || "Bidan Nina (Owner)",
          validated_at: nowIso,
        })
        .eq("id", entry.id);

      if (error) throw error;
      await refetchData();
    } catch (err: any) {
      console.error("Gagal mengaktifkan kembali entri:", err);
      alert("Gagal mengaktifkan kembali entri: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Tabel Tab 2
  const filteredManageEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (manageStatusFilter !== "SEMUA" && entry.status !== manageStatusFilter) {
        return false;
      }
      if (manageSearchTerm.trim()) {
        const query = manageSearchTerm.toLowerCase();
        const matchDiag = (entry.diagnosis_name || "").toLowerCase().includes(query);
        const matchDrug = (entry.medicine_name || "").toLowerCase().includes(query);
        const matchGroup = (entry.patient_group || "").toLowerCase().includes(query);
        return matchDiag || matchDrug || matchGroup;
      }
      return true;
    });
  }, [entries, manageStatusFilter, manageSearchTerm]);

  // Statistik Entri Tab 2
  const stats = useMemo(() => {
    const total = entries.length;
    const tervalidasi = entries.filter((e) => e.status === "TERVALIDASI").length;
    const draf = entries.filter((e) => e.status === "DRAF").length;
    const nonaktif = entries.filter((e) => e.status === "NONAKTIF").length;
    return { total, tervalidasi, draf, nonaktif };
  }, [entries]);

  // =========================================================================
  // LOGIKA TAB 3: KONSUL (DAFTAR & JAWABAN)
  // =========================================================================

  // Hitung jumlah konsul MENUNGGU untuk badge
  const pendingConsultsCount = useMemo(() => {
    return consultations.filter((c) => c.status === "MENUNGGU").length;
  }, [consultations]);

  // Daftar konsul untuk Owner: MENUNGGU di atas, lalu terbaru
  const ownerConsultations = useMemo(() => {
    return [...consultations].sort((a, b) => {
      if (a.status === "MENUNGGU" && b.status !== "MENUNGGU") return -1;
      if (a.status !== "MENUNGGU" && b.status === "MENUNGGU") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [consultations]);

  // Daftar konsul untuk Staff: hanya yang dikirim oleh staff itu sendiri
  const staffConsultations = useMemo(() => {
    return consultations.filter((c) => {
      const staffMatches = c.staff_name?.toLowerCase() === userName.toLowerCase();
      const emailMatches = userEmail && c.staff_name?.toLowerCase() === userEmail.toLowerCase();
      return staffMatches || emailMatches;
    });
  }, [consultations, userName, userEmail]);

  // Handle Jawab Konsul oleh Owner
  const handleAnswerConsult = async (consult: ProtocolConsultation) => {
    const currentAnswer = answerTexts[consult.id];
    if (!currentAnswer || !currentAnswer.trim()) {
      alert("Teks jawaban (nama obat, takaran, dan catatan) wajib diisi!");
      return;
    }

    const isSaveAsProtocol = !!saveAsProtocolFlags[consult.id];
    setIsSubmittingAnswer(true);

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("protocol_consultations")
        .update({
          status: "TERJAWAB",
          answer_text: currentAnswer.trim(),
          answered_by: userName || "Bidan Nina (Owner)",
          answered_at: nowIso,
          saved_as_protocol: isSaveAsProtocol,
        })
        .eq("id", consult.id);

      if (error) throw error;

      await refetchData();

      // Bila checkbox "Simpan jawaban ini sebagai protokol" dicentang:
      // Pindahkan Owner ke Tab 2 dengan form Tambah Protokol terisi awal
      if (isSaveAsProtocol) {
        setActiveTab("kelola");
        setEditingEntryId(null);
        setFormDiagnosisName(consult.diagnosis_query.toUpperCase());
        setFormOwnerNotes(currentAnswer.trim());

        // Pre-fill konteks jika relevan
        if (consult.context?.isPregnant) {
          setFormPatientGroup("BUMIL");
        } else {
          setFormPatientGroup("ANAK");
        }

        if (consult.weight) {
          setFormWeightMin(String(consult.weight));
          setFormWeightMax(String(consult.weight));
        }

        setIsFormOpen(true);
        setTimeout(() => {
          formCardRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        alert("Jawaban konsul berhasil dikirim ke staf.");
      }

      // Bersihkan state input untuk konsul ini
      setAnswerTexts((prev) => {
        const copy = { ...prev };
        delete copy[consult.id];
        return copy;
      });
      setSaveAsProtocolFlags((prev) => {
        const copy = { ...prev };
        delete copy[consult.id];
        return copy;
      });

    } catch (err: any) {
      console.error("Gagal mengirim jawaban konsul:", err);
      alert("Gagal mengirim jawaban konsul: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full min-w-0 pb-12">
      {/* HEADER UTAMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <Pill className="text-pink-500" size={26} /> Protokol Obat
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Clinical Decision Support berbasis protokol tervalidasi Bidan Nina.
          </p>
        </div>

        {/* TAB NAVIGASI */}
        <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab("cari")}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "cari"
                ? "bg-white shadow-sm text-pink-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Search size={16} /> Cari Protokol
          </button>

          {/* TAB 2: KELOLA PROTOKOL (HANYA DIRENDER BILA userRole === 'owner') */}
          {userRole === "owner" && (
            <button
              onClick={() => setActiveTab("kelola")}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "kelola"
                  ? "bg-white shadow-sm text-pink-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText size={16} /> Kelola Protokol
            </button>
          )}

          {/* TAB 3: KONSUL (BISA DIAKSES OWNER & STAFF) */}
          <button
            onClick={() => setActiveTab("konsul")}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "konsul"
                ? "bg-white shadow-sm text-pink-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock size={16} />
            {userRole === "owner" ? "Antrean Konsul" : "Riwayat Konsul"}
            {userRole === "owner" && pendingConsultsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingConsultsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CARI PROTOKOL                                                      */}
      {/* ========================================================================= */}
      {activeTab === "cari" && (
        <div className="space-y-6">
          {/* 1. INPUT PENCARIAN BESAR (AUTOFOCUS) */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <label className="block text-xs md:text-sm font-bold text-gray-700 uppercase tracking-wide">
              Cari Diagnosa Klinis
            </label>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500"
                size={22}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik diagnosa pasien (misal: ISPA, Paratypoid, Gastritis, Batuk Pilek)..."
                className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-base md:text-lg font-bold text-gray-800 transition-all placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>

            {/* Status Hasil Pencocokan Diagnosa */}
            {searchQuery.trim() && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs md:text-sm">
                <span className="text-gray-500 font-medium">Status Diagnosa:</span>
                {matchedDiagnosis ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={15} /> Diagnosa Baku: {matchedDiagnosis}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle size={15} /> Belum ada protokol tervalidasi untuk kata kunci ini
                  </span>
                )}

                {matchedDiagnosis && candidateEntries.length > 0 && (
                  <span className="text-gray-400 text-xs">
                    ({candidateEntries.length} opsi protokol tersedia)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. FORM KONTEKS PASIEN */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <User size={18} className="text-pink-500" />
              <h3 className="font-bold text-sm md:text-base text-gray-800">
                Konteks Klinis Pasien (Untuk Filter & Takaran Dosis)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Usia */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Usia Pasien</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Contoh: 3"
                    value={ageValue}
                    onChange={(e) => setAgeValue(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-semibold"
                  />
                  <select
                    value={ageUnit}
                    onChange={(e) => setAgeUnit(e.target.value as "TH" | "BLN" | "HARI")}
                    className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-bold text-gray-700"
                  >
                    <option value="TH">Tahun</option>
                    <option value="BLN">Bulan</option>
                    <option value="HARI">Hari</option>
                  </select>
                </div>
              </div>

              {/* Berat Badan */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Berat Badan (kg) <span className="text-pink-500">*Parameter Utama</span>
                </label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Contoh: 14.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Status Hamil */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Status Kehamilan</label>
                <select
                  value={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.value as "tidak" | "ya")}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-semibold text-gray-700"
                >
                  <option value="tidak">Tidak Hamil</option>
                  <option value="ya">Sedang Hamil (Bumil)</option>
                </select>
              </div>

              {/* Alergi Obat */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Alergi Obat (Bila Ada)</label>
                <input
                  type="text"
                  placeholder="Contoh: Amoxicillin, Sulfa"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm font-semibold"
                />
              </div>
            </div>

            {/* Checklist Red Flags (Tanda Bahaya) */}
            {allAvailableRedFlags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={15} className="text-rose-500" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                    Pemeriksaan Tanda Bahaya (Red Flags)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2.5">
                  Bila salah satu tanda bahaya di bawah tercentang, saran obat otomatis ditahan demi keselamatan pasien.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {allAvailableRedFlags.map((flag) => {
                    const isChecked = checkedRedFlags.includes(flag);
                    return (
                      <label
                        key={flag}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-rose-50 border-rose-300 text-rose-800 font-bold"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRedFlag(flag)}
                          className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="leading-tight">{flag}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. HASIL SARAN OBAT / KEADAAN TANPA HASIL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="text-pink-500" size={18} />
                Saran Protokol Terpilih
              </h2>
              {matchedDiagnosis && (
                <span className="text-xs font-semibold text-gray-500">
                  Diagnosa: {matchedDiagnosis}
                </span>
              )}
            </div>

            {/* A. Belum Mengetik Pencarian */}
            {!searchQuery.trim() && (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2">
                <Search size={36} className="text-gray-300 mx-auto" />
                <h4 className="font-bold text-gray-700 text-sm md:text-base">Mulai dengan Mengetik Diagnosa</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Sistem akan mencocokkan ejaan klinis secara toleran dengan protokol yang sudah disahkan oleh Bidan Nina.
                </p>
              </div>
            )}

            {/* B. Diagnosa Tidak Ditemukan di Protokol */}
            {searchQuery.trim() && !matchedDiagnosis && (
              <div className="bg-white p-8 rounded-2xl border border-rose-100 text-center space-y-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="font-bold text-gray-800 text-sm md:text-base">
                  Diagnosa ini belum ada protokol tervalidasi
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Tidak ditemukan panduan obat terstandar untuk kata kunci &quot;{searchQuery}&quot;.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openConsultModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all"
                  >
                    <MessageSquare size={16} /> Konsul ke Bidan Nina
                  </button>
                </div>
              </div>
            )}

            {/* C. Ada Red Flag Tercentang (Guardrail §2) */}
            {matchedDiagnosis && hasRedFlagTriggered && (
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm md:text-base">
                  <ShieldAlert size={20} className="text-rose-600" />
                  Saran Obat Ditahan: Terdeteksi Tanda Bahaya (Red Flags)
                </div>
                <p className="text-xs text-rose-700">
                  Pasien menunjukkan tanda bahaya ({checkedRedFlags.join(", ")}). Sesuai prinsip keselamatan klinis,
                  kasus ini tidak boleh ditangani dengan protokol rutin mandiri. Harap segera konsultasikan langsung atau rujuk pasien.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={openConsultModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <MessageSquare size={15} /> Konsul Kasus Darurat Ini ke Bidan Nina
                  </button>
                </div>
              </div>
            )}

            {/* D. Diagnosa Ada tapi Rentang Usia/BB Tidak Cocok */}
            {matchedDiagnosis && !hasRedFlagTriggered && candidateEntries.length > 0 && eligibleEntries.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-amber-200 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Scale size={24} />
                </div>
                <h4 className="font-bold text-gray-800 text-sm md:text-base">
                  Tidak ada entri yang cocok dengan usia/BB pasien
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Protokol untuk &quot;{matchedDiagnosis}&quot; tersedia, namun kriteria usia atau berat badan pasien saat ini
                  berada di luar rentang aman yang ditentukan Bidan Nina.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openConsultModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all"
                  >
                    <MessageSquare size={16} /> Konsul Takaran Pasien Ini ke Bidan Nina
                  </button>
                </div>
              </div>
            )}

            {/* E. Kartu Hasil Protokol (Lolos Semua Kriteria) */}
            {matchedDiagnosis && !hasRedFlagTriggered && eligibleEntries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleEntries.map((entry, idx) => {
                  const doseResult: DoseCalculationResult = computeDose(entry, parsedWeightKg);
                  const isDraft = entry.status === "DRAF";

                  return (
                    <div
                      key={entry.id || idx}
                      className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md space-y-4 ${
                        isDraft ? "border-amber-300 bg-amber-50/20" : "border-gray-200"
                      }`}
                    >
                      {/* Header Kartu Obat */}
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base md:text-lg text-gray-900">
                              {entry.medicine_name}
                            </h3>
                            {isDraft && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded-md">
                                DRAF
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 font-medium">
                            {entry.dosage_form} {entry.concentration ? `(${entry.concentration})` : ""}
                          </p>
                        </div>

                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0">
                          {entry.patient_group || "Umum"}
                        </span>
                      </div>

                      {/* Kotak Takaran Terhitung */}
                      <div className="bg-pink-50/60 border border-pink-100 p-3.5 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider block">
                          Takaran Dosis Rekomendasi
                        </span>

                        {doseResult.success ? (
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-pink-600">
                                {doseResult.roundedAmount}
                              </span>
                              <span className="text-sm font-bold text-pink-700">
                                {doseResult.unit} / kali
                              </span>
                            </div>

                            {/* Info Detail Mentah (khusus sediaan cair ml) */}
                            {doseResult.unit === "ml" && doseResult.rawAmount !== undefined && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Hitungan mentah: {doseResult.rawAmount.toFixed(2)} ml
                                {doseResult.doseMg ? ` (${doseResult.doseMg} mg)` : ""}
                              </p>
                            )}

                            {/* Peringatan bila konsentrasi tidak bisa diparse */}
                            {doseResult.warning && (
                              <div className="mt-2 text-xs text-amber-800 bg-amber-100/70 p-2 rounded-lg flex items-start gap-1.5">
                                <Info size={14} className="shrink-0 mt-0.5 text-amber-700" />
                                <span>{doseResult.warning}</span>
                              </div>
                            )}

                            {/* Peringatan bila melebihi dosis maksimum */}
                            {doseResult.exceedsMax && (
                              <div className="mt-2 text-xs text-rose-800 bg-rose-100 p-2 rounded-lg flex items-start gap-1.5 font-semibold">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-700" />
                                <span>Perhatian: Dosis terhitung melampaui dosis maksimum ({entry.max_dose})!</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-rose-600 font-semibold">
                            {doseResult.error || "Takaran belum dapat dihitung."}
                          </p>
                        )}
                      </div>

                      {/* Rincian Frekuensi & Durasi */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-gray-400 font-semibold block text-[10px] uppercase">Frekuensi</span>
                          <span className="font-bold text-gray-800">{entry.frequency || "-"}</span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-gray-400 font-semibold block text-[10px] uppercase">Durasi</span>
                          <span className="font-bold text-gray-800">{entry.duration || "-"}</span>
                        </div>
                      </div>

                      {/* Syarat & Kontraindikasi */}
                      {(entry.requirements || entry.contraindications) && (
                        <div className="space-y-1.5 text-xs border-t border-gray-100 pt-3">
                          {entry.requirements && (
                            <p className="text-gray-600">
                              <span className="font-bold text-gray-700">Syarat: </span>
                              {entry.requirements}
                            </p>
                          )}
                          {entry.contraindications && (
                            <p className="text-rose-700">
                              <span className="font-bold">Perhatian: </span>
                              {entry.contraindications}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Catatan Khusus Bidan Nina */}
                      {entry.owner_notes && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
                          <span className="font-bold text-gray-800 block text-[10px] uppercase">
                            Catatan Bidan Nina
                          </span>
                          <p className="italic">&quot;{entry.owner_notes}&quot;</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM KIRIM KONSUL (DARI TAB 1 KE TAB 3)                             */}
      {/* ========================================================================= */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-xl">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-800">Konsul Klinis ke Bidan Nina</h3>
                  <p className="text-xs text-gray-400">Pengganti kertas memo internal praktik</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsultModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Konteks yang Terisi Otomatis dari Tab 1 */}
            <div className="bg-pink-50/60 p-3.5 rounded-xl border border-pink-100 text-xs space-y-1.5">
              <span className="font-bold text-[10px] text-pink-800 uppercase tracking-wider block">
                Konteks yang Ikut Terkirim Otomatis
              </span>
              <div className="grid grid-cols-2 gap-2 text-gray-700">
                <div>
                  <span className="text-gray-400 text-[10px] block">Diagnosa:</span>
                  <span className="font-bold text-gray-900">{matchedDiagnosis || searchQuery || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Usia & BB:</span>
                  <span className="font-semibold text-gray-900">
                    {ageValue ? `${ageValue} ${ageUnit}` : "-"} / {weightKg ? `${weightKg} kg` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Kehamilan & Alergi:</span>
                  <span className="font-semibold text-gray-900">
                    {isPregnant === "ya" ? "Hamil" : "Tdk Hamil"} | {allergies || "Tidak ada"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Red Flags:</span>
                  <span className="font-semibold text-rose-700">
                    {checkedRedFlags.length > 0 ? checkedRedFlags.join(", ") : "Tidak ada"}
                  </span>
                </div>
              </div>
            </div>

            {consultSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>{consultSuccessMessage}</span>
              </div>
            )}

            {/* Form Input Tambahan Staf */}
            <form onSubmit={handleSendConsult} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Pasien / Inisial
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ny. Siti / An. Farhan (sesuai isian staf)"
                  value={consultPatientName}
                  onChange={(e) => setConsultPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Anamnesa Staf <span className="text-rose-500">*Wajib</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan keluhan utama pasien, durasi sakit, obat yang sudah diminum, atau pertanyaan spesifik untuk Bidan Nina..."
                  value={consultAnamnesis}
                  onChange={(e) => setConsultAnamnesis(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsConsultModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsult}
                  className="px-5 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingConsult ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Kirim Konsul
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KELOLA PROTOKOL (HANYA DIRENDER JIKA userRole === 'owner')           */}
      {/* ========================================================================= */}
      {userRole === "owner" && activeTab === "kelola" && (
        <div className="space-y-6">
          {/* STATISTIK & AKSI CEPAT */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-gray-400 text-xs font-semibold uppercase">Total Protokol</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="text-emerald-700 text-xs font-semibold uppercase">Tervalidasi</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{stats.tervalidasi}</p>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
              <span className="text-amber-700 text-xs font-semibold uppercase">Draf (Perlu Disahkan)</span>
              <p className="text-2xl font-black text-amber-800 mt-1">{stats.draf}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-gray-500 text-xs font-semibold uppercase">Nonaktif</span>
              <p className="text-2xl font-black text-gray-600 mt-1">{stats.nonaktif}</p>
            </div>
          </div>

          {/* FORM TAMBAH / EDIT PROTOKOL */}
          {isFormOpen && (
            <div
              ref={formCardRef}
              className="bg-white p-5 md:p-7 rounded-2xl shadow-md border-2 border-pink-200 space-y-5 animate-in slide-in-from-top-4 duration-300"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {editingEntryId ? <Pencil size={18} className="text-pink-500" /> : <Plus size={18} className="text-pink-500" />}
                    {editingEntryId ? `Edit Protokol: ${formDiagnosisName}` : "Tambah Protokol Obat Baru"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingEntryId
                      ? "Perbarui pakem dan parameter takaran protokol obat."
                      : "Entri baru yang Anda simpan langsung berstatus TERVALIDASI."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingEntryId(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveProtocol} className="space-y-4">
                {/* 1. Diagnosa & Alias */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Diagnosa Baku <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: ISPA, PARATYPOID, GASTRITIS"
                      value={formDiagnosisName}
                      onChange={(e) => setFormDiagnosisName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-sm font-bold uppercase"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Nama baku utama yang digunakan di sistem.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tulisan Lain yang Biasa Dipakai (Alias)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Batuk pilek, Bapil, Typus (pisahkan koma)"
                      value={formAliases}
                      onChange={(e) => setFormAliases(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-sm font-medium"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Variasi ejaan staf/rekam medis agar pencarian tetap cocok.</p>
                  </div>
                </div>

                {/* 2. Kelompok Pasien & Batas Usia/BB */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Kelompok Pasien <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formPatientGroup}
                      onChange={(e) => setFormPatientGroup(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-bold text-gray-800"
                    >
                      <option value="BAYI">BAYI</option>
                      <option value="BALITA">BALITA</option>
                      <option value="ANAK">ANAK</option>
                      <option value="DEWASA">DEWASA</option>
                      <option value="BUMIL">BUMIL (Ibu Hamil)</option>
                      <option value="BUSUI">BUSUI (Ibu Menyusui)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rentang Usia (Dari - Sampai)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Min"
                        value={formAgeMin}
                        onChange={(e) => setFormAgeMin(e.target.value)}
                        className="w-1/3 px-2 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <span className="self-center text-gray-400 text-xs">-</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Max"
                        value={formAgeMax}
                        onChange={(e) => setFormAgeMax(e.target.value)}
                        className="w-1/3 px-2 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <select
                        value={formAgeUnit}
                        onChange={(e) => setFormAgeUnit(e.target.value as "TH" | "BLN" | "HARI")}
                        className="w-1/3 px-1 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                      >
                        <option value="TH">TH</option>
                        <option value="BLN">BLN</option>
                        <option value="HARI">HARI</option>
                      </select>
                    </div>
                    <span className="text-[10px] text-gray-400">Kosongkan jika tidak dibatasi</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Rentang Berat Badan (kg)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Min kg"
                        value={formWeightMin}
                        onChange={(e) => setFormWeightMin(e.target.value)}
                        className="w-1/2 px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <span className="self-center text-gray-400 text-xs">-</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Max kg"
                        value={formWeightMax}
                        onChange={(e) => setFormWeightMax(e.target.value)}
                        className="w-1/2 px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">Parameter utama dosis anak</span>
                  </div>
                </div>

                {/* 3. Detail Obat & Sediaan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nama Obat (Stok) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Paracetamol Drop, Amoxicillin Sirup"
                      value={formMedicineName}
                      onChange={(e) => setFormMedicineName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Bentuk Sediaan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Sirup / Drop / Tablet / Puyer / Kapsul"
                      value={formDosageForm}
                      onChange={(e) => setFormDosageForm(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Konsentrasi Sediaan
                    </label>
                    <input
                      type="text"
                      placeholder='Contoh: "125 mg/5 ml", "100 mg/ml"'
                      value={formConcentration}
                      onChange={(e) => setFormConcentration(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                    <span className="text-[10px] text-gray-400">Wajib jika sediaan sirup/cair untuk hitung ml</span>
                  </div>
                </div>

                {/* 4. Aturan Takaran Dosis */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-pink-50/40 p-4 rounded-xl border border-pink-100">
                  <div>
                    <label className="block text-xs font-bold text-pink-900 mb-1">
                      Dosis Acuan (mg/kgBB/kali)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Contoh: 10 atau 15"
                      value={formDoseMgPerKg}
                      onChange={(e) => setFormDoseMgPerKg(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                    <span className="text-[10px] text-pink-700">Untuk dosis berbasis BB</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-pink-900 mb-1">
                      Takaran Tetap per Kali
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Contoh: 1 (tablet) / 5 (ml)"
                      value={formDoseFixed}
                      onChange={(e) => setFormDoseFixed(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                    <span className="text-[10px] text-pink-700">Bila takaran fix (dewasa/tablet)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-pink-900 mb-1">
                      Satuan Takaran
                    </label>
                    <input
                      type="text"
                      placeholder="ml / tablet / kapsul / tetes"
                      value={formDoseUnit}
                      onChange={(e) => setFormDoseUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-pink-900 mb-1">
                      Dosis Maksimum
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: 2000 mg/hari"
                      value={formMaxDose}
                      onChange={(e) => setFormMaxDose(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* 5. Frekuensi, Durasi & Syarat */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Frekuensi Pemberian</label>
                    <input
                      type="text"
                      placeholder="Contoh: 3 x sehari, tiap 8 jam"
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Durasi Terapi</label>
                    <input
                      type="text"
                      placeholder="Contoh: 3 hari, 5 hari, bila demam"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Syarat Wajib Pemberian</label>
                    <input
                      type="text"
                      placeholder="Contoh: Sesudah makan, habiskan"
                      value={formRequirements}
                      onChange={(e) => setFormRequirements(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* 6. Kontraindikasi, Red Flags & Catatan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Kontraindikasi & Perhatian
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Perhatian alergi obat, gangguan hepar/ginjal, peringatan hamil..."
                      value={formContraindications}
                      onChange={(e) => setFormContraindications(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1">
                      Red Flags / Tanda Bahaya (Satu per baris)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Demam > 39°C&#10;Nafas cuping hidung&#10;Kejang demam"
                      value={formRedFlags}
                      onChange={(e) => setFormRedFlags(e.target.value)}
                      className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-xs font-medium text-rose-900"
                    />
                    <span className="text-[10px] text-gray-400">Bila tercentang saat pelayanan, saran obat ditahan</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Catatan Bidan Nina
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Catatan personal, arahan khusus untuk staf jaga..."
                      value={formOwnerNotes}
                      onChange={(e) => setFormOwnerNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Tombol Simpan Form */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingEntryId(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        {editingEntryId ? "Simpan Perubahan" : "Simpan & Sahkan Protokol"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TABEL DAFTAR PROTOKOL */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-4 p-5">
            {/* Header Tabel & Kontrol Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-gray-800">Daftar Semua Protokol Obat</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Menampilkan {filteredManageEntries.length} dari {entries.length} protokol terdaftar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={manageSearchTerm}
                    onChange={(e) => setManageSearchTerm(e.target.value)}
                    placeholder="Cari diagnosa atau obat..."
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500 outline-none w-48 md:w-56"
                  />
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
                  <Filter size={13} className="text-gray-400 ml-1.5 mr-0.5" />
                  {(["SEMUA", "TERVALIDASI", "DRAF", "NONAKTIF"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setManageStatusFilter(st)}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                        manageStatusFilter === st
                          ? "bg-white text-pink-600 shadow-xs"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Tombol Tambah Protokol Baru */}
                {!isFormOpen && (
                  <button
                    type="button"
                    onClick={openNewForm}
                    className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={15} /> Tambah Protokol
                  </button>
                )}
              </div>
            </div>

            {/* Kontainer Tabel dengan Horizontal Scroll */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/80 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Diagnosa Baku</th>
                    <th className="px-3 py-3">Kelompok</th>
                    <th className="px-3 py-3">Rentang Usia</th>
                    <th className="px-3 py-3">Rentang BB</th>
                    <th className="px-4 py-3">Nama Obat & Sediaan</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredManageEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                        Tidak ada entri protokol yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredManageEntries.map((entry) => {
                      const isDraft = entry.status === "DRAF";
                      const isValidated = entry.status === "TERVALIDASI";
                      const isInactive = entry.status === "NONAKTIF";

                      const ageDisplay =
                        entry.age_min_value !== null || entry.age_max_value !== null
                          ? `${entry.age_min_value ?? 0} - ${entry.age_max_value ?? "∞"} ${entry.age_unit || "TH"}`
                          : "Semua Usia";

                      const weightDisplay =
                        entry.weight_min_kg !== null || entry.weight_max_kg !== null
                          ? `${entry.weight_min_kg ?? 0} - ${entry.weight_max_kg ?? "∞"} kg`
                          : "Semua BB";

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-gray-50/60 transition-colors ${
                            isDraft ? "bg-amber-50/20" : isInactive ? "opacity-60 bg-gray-50/30" : ""
                          }`}
                        >
                          {/* 1. Diagnosa Baku */}
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {entry.diagnosis_name}
                          </td>

                          {/* 2. Kelompok Pasien */}
                          <td className="px-3 py-3 font-semibold text-blue-700">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[10px]">
                              {entry.patient_group}
                            </span>
                          </td>

                          {/* 3. Rentang Usia */}
                          <td className="px-3 py-3 text-gray-600 font-medium">
                            {ageDisplay}
                          </td>

                          {/* 4. Rentang BB */}
                          <td className="px-3 py-3 text-gray-600 font-medium">
                            {weightDisplay}
                          </td>

                          {/* 5. Nama Obat & Sediaan */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-800">{entry.medicine_name}</div>
                            <div className="text-[11px] text-gray-400 font-medium">
                              {entry.dosage_form} {entry.concentration ? `(${entry.concentration})` : ""}
                            </div>
                          </td>

                          {/* 6. Status Badge */}
                          <td className="px-3 py-3 text-center">
                            {isValidated && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> TERVALIDASI
                              </span>
                            )}
                            {isDraft && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle size={12} /> DRAF
                              </span>
                            )}
                            {isInactive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                                <Ban size={12} /> NONAKTIF
                              </span>
                            )}
                          </td>

                          {/* 7. Aksi */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditForm(entry)}
                                className="px-2.5 py-1 text-gray-600 hover:text-pink-600 hover:bg-pink-50 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Edit entri protokol"
                              >
                                <Pencil size={13} />
                                <span className="hidden sm:inline">Edit</span>
                              </button>

                              {isDraft && (
                                <button
                                  type="button"
                                  onClick={() => handleValidateEntry(entry)}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                  title="Sahkan protokol ini menjadi TERVALIDASI"
                                >
                                  <Check size={13} />
                                  <span>Sahkan</span>
                                </button>
                              )}

                              {!isInactive && (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivateEntry(entry)}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Nonaktifkan protokol"
                                >
                                  <Ban size={13} />
                                  <span className="hidden sm:inline">Nonaktifkan</span>
                                </button>
                              )}

                              {isInactive && (
                                <button
                                  type="button"
                                  onClick={() => handleReactivateEntry(entry)}
                                  disabled={isSubmitting}
                                  className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Aktifkan kembali protokol"
                                >
                                  <RefreshCw size={13} />
                                  <span className="hidden sm:inline">Aktifkan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KONSUL (OWNER & STAFF)                                              */}
      {/* ========================================================================= */}
      {activeTab === "konsul" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="text-pink-500" size={20} />
                {userRole === "owner" ? "Antrean Konsul Klinis Masuk" : "Riwayat Konsul Saya"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {userRole === "owner"
                  ? "Daftar pertanyaan klinis dari staf yang membutuhkan arahan resep/protokol Bidan Nina."
                  : "Pantau respon dan arahan resep dari Bidan Nina untuk kasus yang telah Anda ajukan."}
              </p>
            </div>

            <button
              type="button"
              onClick={refetchData}
              disabled={isLoadingData}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw size={14} className={isLoadingData ? "animate-spin" : ""} />
              Segarkan Data
            </button>
          </div>

          {/* DAFTAR KONSUL OWNER */}
          {userRole === "owner" && (
            <div className="space-y-4">
              {ownerConsultations.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center space-y-2">
                  <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-gray-700 text-base">Tidak Ada Antrean Konsul</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Semua pertanyaan staf sudah terjawab dengan baik.
                  </p>
                </div>
              ) : (
                ownerConsultations.map((item) => {
                  const isPending = item.status === "MENUNGGU";
                  const currentAnswer = answerTexts[item.id] || "";
                  const currentSaveProtocol = !!saveAsProtocolFlags[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                        isPending
                          ? "border-amber-300 bg-amber-50/15"
                          : "border-gray-200"
                      }`}
                    >
                      {/* Header Item Konsul */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isPending
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isPending ? "⏳ MENUNGGU JAWABAN" : "✓ TERJAWAB"}
                          </span>
                          <h4 className="font-bold text-base text-gray-900">
                            {item.patient_name || "Pasien Tanpa Nama"}
                          </h4>
                        </div>

                        <div className="text-xs text-gray-400 font-medium">
                          Diajukan oleh <span className="font-bold text-gray-700">{item.staff_name}</span> • {formatDateTime(item.created_at)}
                        </div>
                      </div>

                      {/* Rincian Kasus Pasien */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 text-xs">
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-bold block">Diagnosa Dicari</span>
                          <span className="font-bold text-gray-900">{item.diagnosis_query}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-bold block">Usia & BB</span>
                          <span className="font-semibold text-gray-800">
                            {item.patient_age || "-"} / {item.weight ? `${item.weight} kg` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-bold block">Status Hamil & Alergi</span>
                          <span className="font-semibold text-gray-800">
                            {item.context?.isPregnant ? "Hamil" : "Tdk Hamil"} • {item.context?.allergies || "Tidak ada"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] uppercase font-bold block">Red Flags</span>
                          <span className={`font-semibold ${item.context?.redFlags?.length ? "text-rose-600 font-bold" : "text-gray-700"}`}>
                            {item.context?.redFlags?.length ? item.context.redFlags.join(", ") : "Tidak ada"}
                          </span>
                        </div>
                      </div>

                      {/* Catatan Anamnesa Staf */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider block">
                          Catatan Anamnesa Staf Jaga:
                        </span>
                        <p className="whitespace-pre-wrap">{item.anamnesis_notes || "-"}</p>
                      </div>

                      {/* AREA JAWABAN: Form jika MENUNGGU, Tampilan Jawaban jika TERJAWAB */}
                      {isPending ? (
                        <div className="pt-2 border-t border-gray-100 space-y-3">
                          <label className="block text-xs font-bold text-gray-800">
                            Jawaban & Arahan Resep Bidan Nina <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Contoh: Berikan Paracetamol drop 0,8 ml tiap 8 jam bila demam + Cefixime sirup 2,5 ml 2x sehari selama 5 hari. Observasi 2 hari..."
                            value={currentAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnswerTexts((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-full px-3.5 py-2.5 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-xs text-gray-800 shadow-xs"
                          />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={currentSaveProtocol}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSaveAsProtocolFlags((prev) => ({ ...prev, [item.id]: checked }));
                                }}
                                className="rounded text-pink-600 focus:ring-pink-500"
                              />
                              <span>Simpan jawaban ini sebagai protokol baru di Tab Kelola Protokol</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleAnswerConsult(item)}
                              disabled={isSubmittingAnswer || !currentAnswer.trim()}
                              className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 self-end sm:self-auto"
                            >
                              {isSubmittingAnswer ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" /> Mengirim...
                                </>
                              ) : (
                                <>
                                  <Send size={13} /> Kirim Jawaban
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] text-emerald-800 uppercase tracking-wider block">
                              Jawaban Bidan Nina ({item.answered_by || "Bidan Nina"})
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              {item.answered_at ? formatDateTime(item.answered_at) : ""}
                            </span>
                          </div>
                          <p className="text-gray-800 font-medium whitespace-pre-wrap">{item.answer_text}</p>
                          {item.saved_as_protocol && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-md font-bold">
                              ✓ Disimpan sebagai protokol
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* DAFTAR KONSUL STAFF */}
          {userRole !== "owner" && (
            <div className="space-y-4">
              {staffConsultations.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center space-y-2">
                  <MessageSquare size={36} className="text-gray-300 mx-auto" />
                  <h4 className="font-bold text-gray-700 text-base">Belum Ada Riwayat Konsul</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Bila menemukan diagnosa yang belum ada protokolnya di Tab Cari Protokol, gunakan tombol &quot;Konsul ke Bidan Nina&quot;.
                  </p>
                </div>
              ) : (
                staffConsultations.map((item) => {
                  const isPending = item.status === "MENUNGGU";

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4"
                    >
                      {/* Header Item Konsul Staf */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isPending
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isPending ? "⏳ MENUNGGU JAWABAN" : "✓ SUDAH DIJAWAB"}
                          </span>
                          <h4 className="font-bold text-base text-gray-900">
                            {item.patient_name || "Pasien"}
                          </h4>
                          <span className="text-xs text-gray-500 font-semibold">
                            ({item.diagnosis_query})
                          </span>
                        </div>

                        <span className="text-xs text-gray-400">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>

                      {/* Rincian yang Diajukan */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100 text-xs">
                        <div>
                          <span className="text-gray-400 text-[10px] block font-bold">Usia / BB:</span>
                          <span className="font-medium text-gray-800">
                            {item.patient_age || "-"} / {item.weight ? `${item.weight} kg` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block font-bold">Kondisi Khusus:</span>
                          <span className="font-medium text-gray-800">
                            {item.context?.isPregnant ? "Hamil" : "Tdk Hamil"} • Alergi: {item.context?.allergies || "Tidak ada"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-[10px] block font-bold">Catatan Anamnesa:</span>
                          <span className="text-gray-700 italic">{item.anamnesis_notes || "-"}</span>
                        </div>
                      </div>

                      {/* Bagian Jawaban Bidan Nina */}
                      {isPending ? (
                        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                          <Clock size={16} className="text-amber-600 shrink-0" />
                          <span>
                            Pertanyaan sedang menunggu evaluasi dan arahan resep dari Bidan Nina. Halaman ini akan otomatis menampilkan jawaban setelah disetujui.
                          </span>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                              <CheckCircle2 size={15} className="text-emerald-600" />
                              Arahan & Resep dari {item.answered_by || "Bidan Nina"}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-medium">
                              {item.answered_at ? formatDateTime(item.answered_at) : ""}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-emerald-200 text-gray-800 font-semibold text-xs whitespace-pre-wrap">
                            {item.answer_text}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}