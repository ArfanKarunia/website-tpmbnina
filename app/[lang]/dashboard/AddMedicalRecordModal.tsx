"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Save,
  Stethoscope,
  Plus,
  Trash2,
  Search,
  Loader2,
  UserCheck,
  UserPlus,
  History,
  Baby,
  HeartPulse,
  User,
  AlertTriangle,
  Building2,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import ActionModal from "./ActionModal";

// --- INTERFACES ---
interface Patient {
  id: string;
  name: string;
  address: string;
  birth_date: string;
  nik?: string;
  hpht?: string;
  husband_name?: string;
}

interface Medicine {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface SelectedMedicine {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  patient_id: string;
  patient_name: string;
  diagnosis: string;
  action: string;
  therapy: string;
  staff_name: string;
  weight: number;
  blood_pressure: string;
  heart_rate: number;
  temperature: number;
  oxygen_saturation: number;
  service_fee: number;
  medicine_cost: number;
  total_price: number;
  risk_level: string;
  height_cm?: number | null;
  lp_cm?: number | null;
  lila_cm?: number | null;
  gds?: number | null;
  tt_status?: string | null;
  jumlah_anak?: number | null;
  anak_terakhir?: string | null;
}

interface BayiData {
  id?: string;
  nama_bayi: string;
  jenis_kelamin: "L" | "P";
  bbl_gram: string;
  pbl_cm: string;
  lk_cm: string;
  ld_cm: string;
  spo2_tangan_kanan: string;
  spo2_kaki: string;
  skrining_shk: "YA" | "TIDAK" | "";
}

interface PatientSnapshot {
  hpht: string | null;
  ukString: string;
  ukWeeks: number | null;
  ancCount: number;
  lastAncDate: string;
  statusText: string;
  statusColor: string;
  isAlreadyDelivered: boolean;
  deliveredDate?: string | null;
  deliveredPlace?: string | null;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: MedicalRecord | null;
}

// --- UTILITY ---
const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return "-";

  const today = new Date();
  const birthDate = new Date(birthDateString);

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years >= 1) {
    return `${years} TH`;
  } else {
    if (months > 0 && days > 0) {
      return `${months} BLN ${days} HARI`;
    } else if (months > 0 && days === 0) {
      return `${months} BLN`;
    } else {
      return `${days} HARI`;
    }
  }
};

const calculatePregnancy = (hphtDate: string, visitDateString: string) => {
  if (!hphtDate) return { uk: "", hpl: "" };

  const hpht = new Date(hphtDate);
  const visitDate = visitDateString ? new Date(visitDateString) : new Date();

  hpht.setHours(0, 0, 0, 0);
  visitDate.setHours(0, 0, 0, 0);

  const hplDate = new Date(hpht);

  if (hplDate.getMonth() <= 2) {
    hplDate.setMonth(hplDate.getMonth() + 9);
  } else {
    hplDate.setMonth(hplDate.getMonth() - 3);
    hplDate.setFullYear(hplDate.getFullYear() + 1);
  }

  hplDate.setDate(hplDate.getDate() + 7);

  const hplString = hplDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const diffTime = visitDate.getTime() - hpht.getTime();

  if (diffTime < 0) {
    return { uk: "Salah Input HPHT", hpl: hplString };
  }

  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  let ukString = `${weeks} Minggu ${days} Hari`;

  if (weeks > 42) {
    ukString += " ⚠️ (Lewat HPL)";
  }

  return { uk: ukString, hpl: hplString };
};

const getDefaultDateTimeLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const defaultBayi: BayiData = {
  nama_bayi: "By. Ny. ",
  jenis_kelamin: "L",
  bbl_gram: "",
  pbl_cm: "",
  lk_cm: "",
  ld_cm: "",
  spo2_tangan_kanan: "",
  spo2_kaki: "",
  skrining_shk: "",
};

const RISK_LEVELS = [
  { value: "RR", label: "RR", desc: "Resiko Rendah", color: "green" },
  { value: "RT", label: "RT", desc: "Resiko Tinggi", color: "yellow" },
  { value: "RST", label: "RST", desc: "Resiko Sangat Tinggi", color: "red" },
];

export default function AddMedicalRecordModal({
  isOpen,
  onClose,
  recordToEdit,
}: ModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // States Pasien & Kunjungan
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [isOldPatient, setIsOldPatient] = useState(false);

  const [visitCategory, setVisitCategory] = useState("Umum (BP)");

  // State Snapshot Pasien (Read-Only)
  const [patientSnapshot, setPatientSnapshot] = useState<PatientSnapshot | null>(
    null
  );

  // State Mode ANC
  const [isAncMode, setIsAncMode] = useState(false);
  const [ancData, setAncData] = useState({
    husband_name: "",
    hpht: "",
    gravida: "",
    usg_type: "2D",
    leopold1: "",
    leopold2: "",
    leopold3: "",
    leopold4: "",
    djj: "",
  });
  const [calcResult, setCalcResult] = useState({ uk: "", hpl: "" });

  // State Mode Persalinan
  const [isPersalinanMode, setIsPersalinanMode] = useState(false);
  const [existingPersalinanId, setExistingPersalinanId] = useState<string | null>(
    null
  );
  const [persalinanData, setPersalinanData] = useState({
    tempat: "TPMB" as "TPMB" | "LUAR",
    tempat_luar_nama: "",
    delivery_datetime: getDefaultDateTimeLocal(),
    normal: true,
    rujuk: false,
    tujuan_rujuk: "",
    keterangan: "",
  });
  const [bayiList, setBayiList] = useState<BayiData[]>([{ ...defaultBayi }]);

  // State Obat & Keuangan
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>(
    []
  );
  const [oldMedicineTrack, setOldMedicineTrack] = useState<
    { name: string; qty: number }[]
  >([]);
  const [medicineLoadError, setMedicineLoadError] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNote, setPaymentNote] = useState("");

  const [formData, setFormData] = useState({
    patient_id: "",
    visit_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    action: "",
    staff_name: "Bidan ",
    weight: "",
    blood_pressure: "",
    heart_rate: "",
    temperature: "",
    spo: "",
    service_fee: 0,
    risk_level: "",
    height_cm: "",
    lp_cm: "",
    lila_cm: "",
    gds: "",
    tt_status: "",
    jumlah_anak: "",
    anak_terakhir: "",
  });

  // --- EFFECTS ---
  useEffect(() => {
    if (ancData.hpht) {
      setCalcResult(calculatePregnancy(ancData.hpht, formData.visit_date));
    }
  }, [ancData.hpht, formData.visit_date]);

  // Fetch Snapshot Pasien
  const fetchPatientSnapshot = async (
    patientId: string,
    currentHpht?: string | null
  ) => {
    if (!patientId) {
      setPatientSnapshot(null);
      return;
    }

    try {
      let hpht = currentHpht;
      if (hpht === undefined) {
        const { data: p } = await supabase
          .from("patients")
          .select("hpht")
          .eq("id", patientId)
          .single();
        hpht = p?.hpht || null;
      }

      // Kunjungan ANC sebelumnya (action mengandung [ANC Data])
      const { data: ancRecs } = await supabase
        .from("medical_records")
        .select("id, visit_date, action")
        .eq("patient_id", patientId)
        .ilike("action", "%[ANC Data]%")
        .order("visit_date", { ascending: false });

      const ancCount = ancRecs?.length || 0;
      const lastAncDate =
        ancRecs && ancRecs.length > 0 ? ancRecs[0].visit_date : "-";

      // Riwayat persalinan terakhir
      const { data: lastPersalinan } = await supabase
        .from("persalinan")
        .select("id, delivery_datetime, tempat, tempat_luar_nama, hpht_snapshot")
        .eq("patient_id", patientId)
        .order("delivery_datetime", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Hitung Usia Kehamilan SAAT INI (hari ini)
      let ukWeeks: number | null = null;
      let ukString = "-";
      if (hpht) {
        const hphtDate = new Date(hpht);
        hphtDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - hphtDate.getTime();
        if (diffTime >= 0) {
          const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          ukWeeks = Math.floor(totalDays / 7);
          const days = totalDays % 7;
          ukString = `${ukWeeks} Minggu ${days} Hari`;
        } else {
          ukString = "Salah Input HPHT";
        }
      }

      // Cek apakah kehamilan dengan HPHT ini sudah pernah tercatat bersalin
      const isAlreadyDelivered = Boolean(
        lastPersalinan &&
          lastPersalinan.hpht_snapshot &&
          hpht &&
          lastPersalinan.hpht_snapshot === hpht
      );

      let statusText = "TIDAK HAMIL";
      let statusColor = "bg-gray-100 text-gray-700 border-gray-200";

      if (lastPersalinan && (!hpht || isAlreadyDelivered)) {
        const tglFormatted = new Date(
          lastPersalinan.delivery_datetime
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const tempatLabel =
          lastPersalinan.tempat === "LUAR"
            ? lastPersalinan.tempat_luar_nama || "Luar TPMB"
            : "TPMB";
        statusText = `BERSALIN (${tglFormatted} • ${tempatLabel})`;
        statusColor = "bg-purple-100 text-purple-700 border-purple-200";
      } else if (hpht) {
        if (ukWeeks !== null && ukWeeks > 42) {
          statusText = `PERLU FOLLOW-UP (UK ${ukWeeks} mg)`;
          statusColor = "bg-amber-100 text-amber-800 border-amber-300";
        } else {
          statusText = `HAMIL AKTIF (${ukString})`;
          statusColor = "bg-pink-100 text-pink-700 border-pink-200";
        }
      }

      setPatientSnapshot({
        hpht: hpht || null,
        ukString: hpht ? ukString : "-",
        ukWeeks,
        ancCount,
        lastAncDate,
        statusText,
        statusColor,
        isAlreadyDelivered,
        deliveredDate: lastPersalinan?.delivery_datetime
          ? new Date(lastPersalinan.delivery_datetime).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "short", year: "numeric" }
            )
          : null,
        deliveredPlace:
          lastPersalinan?.tempat === "LUAR"
            ? lastPersalinan.tempat_luar_nama || "Luar TPMB"
            : "TPMB",
      });
    } catch (err) {
      console.error("[AddMedicalRecord] Error fetching patient snapshot:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initData = async () => {
        const { data: medData } = await supabase
          .from("medicines")
          .select("*")
          .order("name");
        setMedicines(medData || []);

        if (recordToEdit) {
          // --- EDIT MODE ---
          setFormData({
            patient_id: recordToEdit.patient_id,
            visit_date: recordToEdit.visit_date,
            diagnosis: recordToEdit.diagnosis.replace(/G\d+\s-\s/, ""),
            action: recordToEdit.action?.split("\n\n[ANC Data]")[0] || "",
            staff_name: recordToEdit.staff_name || "Bidan ",
            weight: recordToEdit.weight?.toString() || "",
            blood_pressure: recordToEdit.blood_pressure || "",
            heart_rate: recordToEdit.heart_rate?.toString() || "",
            temperature: recordToEdit.temperature?.toString() || "",
            spo: recordToEdit.oxygen_saturation?.toString() || "",
            service_fee: recordToEdit.service_fee,
            risk_level: recordToEdit.risk_level || "",
            height_cm:
              recordToEdit.height_cm !== null &&
              recordToEdit.height_cm !== undefined
                ? recordToEdit.height_cm.toString()
                : "",
            lp_cm:
              recordToEdit.lp_cm !== null && recordToEdit.lp_cm !== undefined
                ? recordToEdit.lp_cm.toString()
                : "",
            lila_cm:
              recordToEdit.lila_cm !== null &&
              recordToEdit.lila_cm !== undefined
                ? recordToEdit.lila_cm.toString()
                : "",
            gds:
              recordToEdit.gds !== null && recordToEdit.gds !== undefined
                ? recordToEdit.gds.toString()
                : "",
            tt_status: recordToEdit.tt_status || "",
            jumlah_anak:
              recordToEdit.jumlah_anak !== null &&
              recordToEdit.jumlah_anak !== undefined
                ? recordToEdit.jumlah_anak.toString()
                : "",
            anak_terakhir: recordToEdit.anak_terakhir || "",
          });
          setPatientQuery(recordToEdit.patient_name || "");
          checkPatientHistory(recordToEdit.patient_id);
          fetchPatientSnapshot(recordToEdit.patient_id);
          setVisitCategory("Umum (BP)");

          setPaymentMethod("CASH");
          setPaymentNote("");

          // Deteksi mode ANC
          if (
            recordToEdit.diagnosis.toLowerCase().includes("hamil") ||
            recordToEdit.diagnosis.toLowerCase().includes("anc") ||
            recordToEdit.action.includes("[ANC Data]")
          ) {
            setIsAncMode(true);
          }

          // Cek apakah ada data persalinan tertaut pada rekam medis ini
          const { data: persalinanRec } = await supabase
            .from("persalinan")
            .select("*, persalinan_bayi(*)")
            .eq("medical_record_id", recordToEdit.id)
            .maybeSingle();

          if (persalinanRec) {
            setIsPersalinanMode(true);
            setExistingPersalinanId(persalinanRec.id);
            setPersalinanData({
              tempat: (persalinanRec.tempat as "TPMB" | "LUAR") || "TPMB",
              tempat_luar_nama: persalinanRec.tempat_luar_nama || "",
              delivery_datetime: persalinanRec.delivery_datetime
                ? persalinanRec.delivery_datetime.slice(0, 16)
                : getDefaultDateTimeLocal(),
              normal: persalinanRec.normal ?? true,
              rujuk: persalinanRec.rujuk ?? false,
              tujuan_rujuk: persalinanRec.tujuan_rujuk || "",
              keterangan: persalinanRec.keterangan || "",
            });

            if (
              persalinanRec.persalinan_bayi &&
              persalinanRec.persalinan_bayi.length > 0
            ) {
              setBayiList(
                persalinanRec.persalinan_bayi.map((b: any) => ({
                  id: b.id,
                  nama_bayi: b.nama_bayi || "",
                  jenis_kelamin: (b.jenis_kelamin as "L" | "P") || "L",
                  bbl_gram:
                    b.bbl_gram !== null && b.bbl_gram !== undefined
                      ? b.bbl_gram.toString()
                      : "",
                  pbl_cm:
                    b.pbl_cm !== null && b.pbl_cm !== undefined
                      ? b.pbl_cm.toString()
                      : "",
                  lk_cm:
                    b.lk_cm !== null && b.lk_cm !== undefined
                      ? b.lk_cm.toString()
                      : "",
                  ld_cm:
                    b.ld_cm !== null && b.ld_cm !== undefined
                      ? b.ld_cm.toString()
                      : "",
                  spo2_tangan_kanan:
                    b.spo2_tangan_kanan !== null &&
                    b.spo2_tangan_kanan !== undefined
                      ? b.spo2_tangan_kanan.toString()
                      : "",
                  spo2_kaki:
                    b.spo2_kaki !== null && b.spo2_kaki !== undefined
                      ? b.spo2_kaki.toString()
                      : "",
                  skrining_shk: b.skrining_shk || "",
                }))
              );
            } else {
              setBayiList([{ ...defaultBayi }]);
            }
          } else {
            setIsPersalinanMode(false);
            setExistingPersalinanId(null);
            setPersalinanData({
              tempat: "TPMB",
              tempat_luar_nama: "",
              delivery_datetime: getDefaultDateTimeLocal(),
              normal: true,
              rujuk: false,
              tujuan_rujuk: "",
              keterangan: "",
            });
            setBayiList([{ ...defaultBayi }]);
          }

          // Pulihkan obat
          const { data: items } = await supabase
            .from("visit_items")
            .select("*")
            .eq("visit_id", recordToEdit.id);

          if (items && items.length > 0) {
            const recoveredCart = items.map((i: any) => {
              const foundMed = medData?.find((m) => m.id === i.item_id);
              return {
                id: i.item_id,
                name: foundMed ? foundMed.name : "Obat (Data Lama)",
                qty: i.qty,
                price: i.price_at_transaction,
              };
            });
            setSelectedMedicines(recoveredCart);
            setOldMedicineTrack(
              recoveredCart.map((i) => ({ name: i.name, qty: i.qty }))
            );
            setMedicineLoadError(false);
          } else {
            setSelectedMedicines([]);
            setOldMedicineTrack([]);
            if (recordToEdit.therapy && recordToEdit.therapy.length > 3)
              setMedicineLoadError(true);
          }
        } else {
          // --- NEW MODE ---
          setFormData({
            patient_id: "",
            visit_date: new Date().toISOString().split("T")[0],
            diagnosis: "",
            action: "",
            staff_name: "Bidan ",
            weight: "",
            blood_pressure: "",
            heart_rate: "",
            temperature: "",
            spo: "",
            service_fee: 0,
            risk_level: "",
            height_cm: "",
            lp_cm: "",
            lila_cm: "",
            gds: "",
            tt_status: "",
            jumlah_anak: "",
            anak_terakhir: "",
          });
          setAncData({
            husband_name: "",
            hpht: "",
            gravida: "",
            usg_type: "2D",
            leopold1: "",
            leopold2: "",
            leopold3: "",
            leopold4: "",
            djj: "",
          });
          setCalcResult({ uk: "", hpl: "" });
          setIsAncMode(false);

          // Reset mode persalinan
          setIsPersalinanMode(false);
          setExistingPersalinanId(null);
          setPersalinanData({
            tempat: "TPMB",
            tempat_luar_nama: "",
            delivery_datetime: getDefaultDateTimeLocal(),
            normal: true,
            rujuk: false,
            tujuan_rujuk: "",
            keterangan: "",
          });
          setBayiList([{ ...defaultBayi }]);

          setPatientSnapshot(null);
          setPatientQuery("");
          setSelectedMedicines([]);
          setOldMedicineTrack([]);
          setVisitCount(0);
          setIsOldPatient(false);
          setMedicineLoadError(false);
          setVisitCategory("Umum (BP)");
          setPaymentMethod("CASH");
          setPaymentNote("");
        }
      };
      initData();
    }
  }, [isOpen, recordToEdit]);

  // --- HANDLERS PASIEN ---
  const checkPatientHistory = async (patientId: string) => {
    const { count } = await supabase
      .from("medical_records")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", patientId);
    setVisitCount(count || 0);
    setIsOldPatient((count || 0) > 0);
  };

  const handleSearchPatient = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientQuery(e.target.value);
    setShowPatientDropdown(true);
    if (e.target.value === "") {
      setFormData((prev) => ({ ...prev, patient_id: "" }));
      setPatientResults([]);
      setPatientSnapshot(null);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearchingPatient(true);
      const { data } = await supabase
        .from("patients")
        .select("*")
        .ilike("name", `%${e.target.value}%`)
        .limit(10);
      if (data) setPatientResults(data);
      setIsSearchingPatient(false);
    }, 300);
  };

  const selectPatient = (patient: Patient) => {
    setFormData((prev) => ({ ...prev, patient_id: patient.id }));
    setPatientQuery(patient.name);
    setShowPatientDropdown(false);
    checkPatientHistory(patient.id);
    setAncData((prev) => ({
      ...prev,
      husband_name: patient.husband_name || "",
      hpht: patient.hpht || "",
    }));

    // Update nama bayi default dengan nama ibu
    setBayiList((prev) =>
      prev.map((b, idx) => {
        if (b.nama_bayi === "By. Ny. " || b.nama_bayi.startsWith("By. Ny. ")) {
          return {
            ...b,
            nama_bayi: `By. Ny. ${patient.name}${idx > 0 ? ` (${idx + 1})` : ""}`,
          };
        }
        return b;
      })
    );

    fetchPatientSnapshot(patient.id, patient.hpht);
  };

  // --- HANDLERS BAYI (PERSALINAN) ---
  const handleAddBayi = () => {
    setBayiList((prev) => [
      ...prev,
      {
        ...defaultBayi,
        nama_bayi: `By. Ny. ${patientQuery} (${prev.length + 1})`,
      },
    ]);
  };

  const handleRemoveBayi = (index: number) => {
    if (bayiList.length <= 1) return;
    setBayiList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBayiChange = (
    index: number,
    field: keyof BayiData,
    value: any
  ) => {
    setBayiList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // --- HANDLERS OBAT ---
  const addMedicineToCart = (medId: string) => {
    const med = medicines.find((m) => m.id === medId);
    if (med) {
      setSelectedMedicines((prev) => {
        const existing = prev.find((m) => m.id === medId);
        return existing
          ? prev.map((m) => (m.id === medId ? { ...m, qty: m.qty + 1 } : m))
          : [...prev, { id: med.id, name: med.name, qty: 1, price: med.price }];
      });
      setMedicineLoadError(false);
    }
  };

  const updateQty = (index: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    setSelectedMedicines((prev) => {
      const newCart = [...prev];
      newCart[index].qty = newQty;
      return newCart;
    });
  };

  const removeMedicineFromCart = (index: number) =>
    setSelectedMedicines((prev) => prev.filter((_, i) => i !== index));

  const medicineTotal = useMemo(
    () => selectedMedicines.reduce((acc, item) => acc + item.price * item.qty, 0),
    [selectedMedicines]
  );
  const grandTotal = Number(formData.service_fee) + medicineTotal;

  // --- SUBMIT UTAMA ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id) return alert("Mohon pilih pasien!");

    // Validasi Mode Persalinan
    if (isPersalinanMode) {
      if (!persalinanData.delivery_datetime) {
        alert("Mohon isi tanggal dan jam persalinan!");
        return;
      }

      if (persalinanData.tempat === "TPMB") {
        if (persalinanData.rujuk && !persalinanData.tujuan_rujuk.trim()) {
          alert("Mohon isi faskes tujuan rujukan!");
          return;
        }

        if (bayiList.length === 0) {
          alert("Mohon masukkan minimal 1 data bayi baru lahir!");
          return;
        }

        for (let i = 0; i < bayiList.length; i++) {
          const b = bayiList[i];
          if (!b.nama_bayi.trim()) {
            alert(`Mohon lengkapi nama bayi ke-${i + 1}!`);
            return;
          }
          if (!b.jenis_kelamin) {
            alert(`Mohon tentukan jenis kelamin bayi ke-${i + 1}!`);
            return;
          }
          if (
            !b.bbl_gram ||
            isNaN(parseFloat(b.bbl_gram)) ||
            parseFloat(b.bbl_gram) <= 0
          ) {
            alert(
              `Mohon isi berat badan lahir (BBL) bayi ke-${i + 1} dengan angka valid (gram)!`
            );
            return;
          }
        }
      } else {
        // Mode LUAR
        if (!persalinanData.tempat_luar_nama.trim()) {
          alert("Mohon isi nama tempat persalinan luar!");
          return;
        }
      }

      // Konfirmasi penyelesaian kehamilan (Hanya pada simpan baru atau jika kehamilan masih aktif)
      if (!existingPersalinanId) {
        const confirmed = window.confirm(
          "Simpan persalinan akan menyelesaikan kehamilan ini — HPHT dihapus dari pantauan aktif, riwayat tersimpan. Lanjutkan?"
        );
        if (!confirmed) {
          return; // BERHENTI TOTAL (tidak ada yang tersimpan, HPHT tetap ada)
        }
      }
    }

    setLoading(true);

    try {
      const { data: selectedPatient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", formData.patient_id)
        .single();

      const therapyString = selectedMedicines
        .map((m) => `${m.name} (${m.qty})`)
        .join(", ");
      const realAge = selectedPatient?.birth_date
        ? calculateAge(selectedPatient.birth_date)
        : "-";

      // Update ANC di pasien jika mode ANC
      if (isAncMode) {
        await supabase
          .from("patients")
          .update({
            hpht: ancData.hpht || null,
            husband_name: ancData.husband_name,
          })
          .eq("id", formData.patient_id);
      }

      let finalDiagnosis = formData.diagnosis;
      let finalAction = formData.action;
      if (isAncMode) {
        finalDiagnosis = ancData.gravida
          ? `${ancData.gravida} - ${formData.diagnosis}`
          : formData.diagnosis;
        const ancDetails = `\n\n[ANC Data]\nSuami: ${ancData.husband_name}\nUSG: ${ancData.usg_type}\nDJJ: ${ancData.djj}\nLeo 1-4: ${ancData.leopold1}/${ancData.leopold2}/${ancData.leopold3}/${ancData.leopold4}`;
        finalAction = `${formData.action}${ancDetails}`;
      }

      let finalTherapy = therapyString;
      if (selectedMedicines.length === 0 && recordToEdit && recordToEdit.therapy) {
        finalTherapy = recordToEdit.therapy;
      }

      const payload = {
        visit_date: formData.visit_date,
        patient_id: formData.patient_id,
        patient_name: selectedPatient?.name,
        patient_address: selectedPatient?.address,
        patient_age: realAge,
        weight: parseFloat(formData.weight) || 0,
        blood_pressure: formData.blood_pressure,
        heart_rate: parseInt(formData.heart_rate) || 0,
        temperature: parseFloat(formData.temperature) || 0,
        oxygen_saturation: parseFloat(formData.spo) || 0,
        diagnosis: finalDiagnosis,
        action: finalAction,
        therapy: finalTherapy,
        staff_name: formData.staff_name,
        risk_level: formData.risk_level,
        medicine_cost: medicineTotal,
        service_fee: formData.service_fee,
        total_price: grandTotal,
        height_cm: parseFloat(formData.height_cm) || null,
        lp_cm: parseFloat(formData.lp_cm) || null,
        lila_cm: parseFloat(formData.lila_cm) || null,
        gds: parseFloat(formData.gds) || null,
        tt_status: formData.tt_status.trim() || null,
        jumlah_anak:
          formData.jumlah_anak !== "" && !isNaN(parseInt(formData.jumlah_anak))
            ? parseInt(formData.jumlah_anak)
            : null,
        anak_terakhir: formData.anak_terakhir.trim() || null,
      };

      // ----------------------------------------------------------------------
      // 1. Simpan kunjungan medical_records dulu -> dapatkan recordId
      // ----------------------------------------------------------------------
      let recordId = recordToEdit?.id;

      if (recordToEdit) {
        // UPDATE MODE
        const { data: oldItems } = await supabase
          .from("visit_items")
          .select("*")
          .eq("visit_id", recordId);

        if (oldItems && oldItems.length > 0) {
          for (const item of oldItems) {
            const { data: med } = await supabase
              .from("medicines")
              .select("stock")
              .eq("id", item.item_id)
              .single();
            if (med)
              await supabase
                .from("medicines")
                .update({ stock: med.stock + item.qty })
                .eq("id", item.item_id);
          }
          await supabase.from("visit_items").delete().eq("visit_id", recordId);
        }

        const { error: errUpdateMr } = await supabase
          .from("medical_records")
          .update(payload)
          .eq("id", recordToEdit.id);
        if (errUpdateMr) throw errUpdateMr;

        await supabase.from("transactions").delete().eq("visit_id", recordId);
      } else {
        // INSERT MODE
        const { data: newRec, error: errInsertMr } = await supabase
          .from("medical_records")
          .insert([payload])
          .select()
          .single();
        if (errInsertMr) throw errInsertMr;
        recordId = newRec.id;
      }

      // ----------------------------------------------------------------------
      // 2. Transaksi & Resep Obat (seperti biasa)
      // ----------------------------------------------------------------------
      const transactionsPayload = [];
      const txType =
        paymentMethod === "QRIS" ||
        paymentMethod === "BPJS" ||
        paymentMethod === "BKKBN"
          ? "out"
          : "in";
      const noteSuffix = paymentNote ? ` - ${paymentNote}` : "";

      transactionsPayload.push({
        date: formData.visit_date,
        description: `Jasa: ${selectedPatient?.name} (${visitCategory}) [${paymentMethod}]${noteSuffix}`,
        category: "Layanan Medis",
        type: txType,
        amount: formData.service_fee || 0,
        quantity: 1,
        visit_id: recordId,
      });

      if (medicineTotal > 0) {
        transactionsPayload.push({
          date: formData.visit_date,
          description: `Obat: ${selectedPatient?.name} (${visitCategory}) [${paymentMethod}]${noteSuffix}`,
          category: "Obat & Vitamin",
          type: txType,
          amount: medicineTotal,
          quantity: 1,
          visit_id: recordId,
        });
      }

      if (transactionsPayload.length > 0) {
        await supabase.from("transactions").insert(transactionsPayload);
      }

      if (selectedMedicines.length > 0 && recordId) {
        const itemsPayload = selectedMedicines.map((m) => ({
          visit_id: recordId,
          item_id: m.id,
          qty: m.qty,
          price_at_transaction: m.price,
          subtotal: m.qty * m.price,
        }));

        await supabase.from("visit_items").insert(itemsPayload);

        for (const item of selectedMedicines) {
          const { data: freshMed } = await supabase
            .from("medicines")
            .select("stock")
            .eq("id", item.id)
            .single();
          if (freshMed) {
            await supabase
              .from("medicines")
              .update({ stock: freshMed.stock - item.qty })
              .eq("id", item.id);
          }
        }
      }

      // ----------------------------------------------------------------------
      // 3. Simpan Persalinan & Bayi Baru Lahir (Jika Mode Persalinan Dicentang)
      // ----------------------------------------------------------------------
      if (isPersalinanMode && recordId) {
        const currentHpht = selectedPatient?.hpht || ancData.hpht || null;
        const isTpmb = persalinanData.tempat === "TPMB";

        const persalinanPayload = {
          patient_id: formData.patient_id,
          medical_record_id: recordId,
          hpht_snapshot: currentHpht,
          delivery_datetime: new Date(
            persalinanData.delivery_datetime
          ).toISOString(),
          tempat: persalinanData.tempat,
          tempat_luar_nama: isTpmb
            ? null
            : persalinanData.tempat_luar_nama.trim(),
          normal: isTpmb ? persalinanData.normal : false,
          rujuk: isTpmb ? persalinanData.rujuk : false,
          tujuan_rujuk:
            isTpmb && persalinanData.rujuk
              ? persalinanData.tujuan_rujuk.trim()
              : null,
          staff_name: formData.staff_name || null,
          keterangan: persalinanData.keterangan.trim() || null,
        };

        let activePersalinanId = existingPersalinanId;

        if (existingPersalinanId) {
          // UPDATE baris persalinan yang sudah ada
          const { error: errUpPersalinan } = await supabase
            .from("persalinan")
            .update(persalinanPayload)
            .eq("id", existingPersalinanId);
          if (errUpPersalinan) {
            throw new Error(
              "Gagal memperbarui data persalinan: " + errUpPersalinan.message
            );
          }
        } else {
          // INSERT baris persalinan baru
          const { data: newPersalinan, error: errInPersalinan } = await supabase
            .from("persalinan")
            .insert([persalinanPayload])
            .select()
            .single();
          if (errInPersalinan) {
            throw new Error(
              "Gagal menyimpan data persalinan: " + errInPersalinan.message
            );
          }
          activePersalinanId = newPersalinan.id;
        }

        // Mode TPMB: Simpan kartu data bayi
        if (isTpmb && activePersalinanId) {
          if (existingPersalinanId) {
            // Mode Edit: sinkronisasi bayi (update / insert / delete)
            const { data: existingDbBayi } = await supabase
              .from("persalinan_bayi")
              .select("id")
              .eq("persalinan_id", activePersalinanId);

            const dbBayiIds = (existingDbBayi || []).map((b) => b.id);
            const formBayiIds = bayiList
              .map((b) => b.id)
              .filter(Boolean) as string[];

            // Hapus kartu bayi yang dibuang
            const toDelete = dbBayiIds.filter((id) => !formBayiIds.includes(id));
            if (toDelete.length > 0) {
              await supabase
                .from("persalinan_bayi")
                .delete()
                .in("id", toDelete);
            }

            // Update atau insert masing-masing bayi
            for (const b of bayiList) {
              const babyPayload = {
                persalinan_id: activePersalinanId,
                nama_bayi: b.nama_bayi.trim(),
                jenis_kelamin: b.jenis_kelamin,
                bbl_gram: b.bbl_gram ? parseFloat(b.bbl_gram) : null,
                pbl_cm: b.pbl_cm ? parseFloat(b.pbl_cm) : null,
                lk_cm: b.lk_cm ? parseFloat(b.lk_cm) : null,
                ld_cm: b.ld_cm ? parseFloat(b.ld_cm) : null,
                spo2_tangan_kanan: b.spo2_tangan_kanan
                  ? parseFloat(b.spo2_tangan_kanan)
                  : null,
                spo2_kaki: b.spo2_kaki ? parseFloat(b.spo2_kaki) : null,
                skrining_shk:
                  b.skrining_shk === "YA" || b.skrining_shk === "TIDAK"
                    ? b.skrining_shk
                    : null,
                diperbarui_oleh: formData.staff_name || null,
                diperbarui_pada: new Date().toISOString(),
              };

              if (b.id) {
                const { error: errUpBaby } = await supabase
                  .from("persalinan_bayi")
                  .update(babyPayload)
                  .eq("id", b.id);
                if (errUpBaby)
                  throw new Error(
                    "Gagal memperbarui data bayi: " + errUpBaby.message
                  );
              } else {
                const { error: errInBaby } = await supabase
                  .from("persalinan_bayi")
                  .insert([
                    {
                      ...babyPayload,
                      diperbarui_oleh: null,
                      diperbarui_pada: null,
                    },
                  ]);
                if (errInBaby)
                  throw new Error(
                    "Gagal menyimpan data bayi baru: " + errInBaby.message
                  );
              }
            }
          } else {
            // Mode Baru: insert seluruh kartu bayi
            const newBayiPayloads = bayiList.map((b) => ({
              persalinan_id: activePersalinanId,
              nama_bayi: b.nama_bayi.trim(),
              jenis_kelamin: b.jenis_kelamin,
              bbl_gram: b.bbl_gram ? parseFloat(b.bbl_gram) : null,
              pbl_cm: b.pbl_cm ? parseFloat(b.pbl_cm) : null,
              lk_cm: b.lk_cm ? parseFloat(b.lk_cm) : null,
              ld_cm: b.ld_cm ? parseFloat(b.ld_cm) : null,
              spo2_tangan_kanan: b.spo2_tangan_kanan
                ? parseFloat(b.spo2_tangan_kanan)
                : null,
              spo2_kaki: b.spo2_kaki ? parseFloat(b.spo2_kaki) : null,
              skrining_shk:
                b.skrining_shk === "YA" || b.skrining_shk === "TIDAK"
                  ? b.skrining_shk
                  : null,
              diperbarui_oleh: null,
              diperbarui_pada: null,
            }));

            const { error: errInBabies } = await supabase
              .from("persalinan_bayi")
              .insert(newBayiPayloads);
            if (errInBabies) {
              throw new Error(
                "Gagal menyimpan data bayi: " + errInBabies.message
              );
            }
          }
        }

        // --------------------------------------------------------------------
        // 4. TERAKHIR: Selesaikan kehamilan -> update patients.hpht = null
        //    (Hanya jika mode baru, bukan edit yang sudah selesai sebelumnya)
        // --------------------------------------------------------------------
        if (!existingPersalinanId) {
          const { error: errClearHpht } = await supabase
            .from("patients")
            .update({ hpht: null })
            .eq("id", formData.patient_id);
          if (errClearHpht) {
            throw new Error(
              "Gagal memperbarui status kehamilan pasien: " +
                errClearHpht.message
            );
          }
        }
      }

      setShowSuccess(true);
    } catch (error: any) {
      alert("Terjadi Kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
    router.refresh();
  };

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* HEADER */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white rounded-t-2xl shrink-0">
              <h3 className="font-bold flex items-center gap-2">
                <Stethoscope size={20} />{" "}
                {recordToEdit ? "Edit Rekam Medis" : "Input Pelayanan Baru"}
              </h3>
              <button onClick={onClose}>
                <X size={20} className="hover:text-red-200" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* SEARCH PASIEN, KATEGORI & TANGGAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BARIS 1: Cari Pasien (Lebar Penuh) */}
                  <div className="relative md:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Cari Pasien
                      </label>
                      {formData.patient_id && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            isOldPatient
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isOldPatient ? (
                            <UserCheck size={10} />
                          ) : (
                            <UserPlus size={10} />
                          )}{" "}
                          {isOldPatient
                            ? `Pasien Lama (Ke-${visitCount})`
                            : "Pasien Baru"}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama pasien..."
                        className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={patientQuery}
                        onChange={handleSearchPatient}
                        onFocus={() => setShowPatientDropdown(true)}
                      />
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      {isSearchingPatient && (
                        <Loader2
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                          size={16}
                        />
                      )}
                    </div>
                    {showPatientDropdown && patientQuery.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {patientResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => selectPatient(p)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                          >
                            <p className="text-sm font-bold text-gray-800">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.address} •{" "}
                              {p.birth_date ? calculateAge(p.birth_date) : "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SNAPSHOT PASIEN READ-ONLY */}
                  {patientSnapshot && formData.patient_id && (
                    <div className="md:col-span-2 bg-gradient-to-r from-slate-50 to-indigo-50/40 p-3.5 rounded-xl border border-indigo-100 shadow-sm text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                          <Info size={14} className="text-indigo-600" /> Snapshot
                          Status Reproduksi & Kehamilan
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${patientSnapshot.statusColor}`}
                        >
                          {patientSnapshot.statusText}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-600">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                            HPHT Aktif
                          </span>
                          <span className="font-bold text-gray-800">
                            {patientSnapshot.hpht
                              ? patientSnapshot.hpht
                              : "Tidak Ada / Selesai"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                            Usia Kehamilan Saat Ini
                          </span>
                          <span className="font-bold text-gray-800">
                            {patientSnapshot.ukString}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                            Kunjungan ANC
                          </span>
                          <span className="font-bold text-gray-800">
                            {patientSnapshot.ancCount} kali
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                            ANC Terakhir
                          </span>
                          <span className="font-bold text-gray-800">
                            {patientSnapshot.lastAncDate}
                          </span>
                        </div>
                      </div>

                      {/* Peringatan jika kehamilan ini sudah tercatat bersalin */}
                      {patientSnapshot.isAlreadyDelivered && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-xs flex items-center gap-2 mt-1">
                          <AlertTriangle
                            size={16}
                            className="text-amber-600 shrink-0"
                          />
                          <span>
                            <strong>Perhatian:</strong> Kehamilan ini sudah
                            tercatat bersalin pada{" "}
                            <strong>{patientSnapshot.deliveredDate}</strong> (
                            {patientSnapshot.deliveredPlace}) — pastikan tidak
                            duplikat.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BARIS 2: Kategori & Tanggal */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Kategori Kunjungan
                    </label>
                    <select
                      required
                      className="w-full p-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={visitCategory}
                      onChange={(e) => setVisitCategory(e.target.value)}
                    >
                      <option value="Umum (BP)">Umum (BP)</option>
                      <option value="KIA - BPJS">KIA - BPJS</option>
                      <option value="KIA - Non BPJS">KIA - Non BPJS</option>
                      <option value="KB">KB</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.visit_date}
                      onChange={(e) =>
                        setFormData({ ...formData, visit_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* TANDA VITAL */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">
                    Tanda Vital
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        BB (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full p-2 border rounded-lg text-sm"
                        value={formData.weight}
                        onChange={(e) =>
                          setFormData({ ...formData, weight: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Tensi
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg text-sm"
                        value={formData.blood_pressure}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            blood_pressure: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Nadi
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded-lg text-sm"
                        value={formData.heart_rate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heart_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Suhu (C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full p-2 border rounded-lg text-sm"
                        value={formData.temperature}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            temperature: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        SPO2 (%)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded-lg text-sm"
                        value={formData.spo}
                        onChange={(e) =>
                          setFormData({ ...formData, spo: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* DATA TAMBAHAN LAPORAN (OPSIONAL) */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">
                    Data Tambahan Laporan{" "}
                    <span className="text-xs font-normal text-gray-400">
                      (Opsional)
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        TB/PB (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 155"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.height_cm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            height_cm: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Lingkar Perut (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 80"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.lp_cm}
                        onChange={(e) =>
                          setFormData({ ...formData, lp_cm: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        LILA (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 24.5"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.lila_cm}
                        onChange={(e) =>
                          setFormData({ ...formData, lila_cm: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        GDS (mg/dL)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Contoh: 110"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.gds}
                        onChange={(e) =>
                          setFormData({ ...formData, gds: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Status TT
                      </label>
                      <input
                        type="text"
                        placeholder="Mis. TT1/TT2/TT3"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.tt_status}
                        onChange={(e) =>
                          setFormData({ ...formData, tt_status: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Jumlah Anak
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Contoh: 2"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.jumlah_anak}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jumlah_anak: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-400">
                        Anak Terakhir
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: L / 12-03-2024"
                        className="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.anak_terakhir}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            anak_terakhir: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 1: ANC TOGGLE (PINK) */}
                <div className="border border-pink-200 bg-pink-50 rounded-xl p-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setIsAncMode(!isAncMode)}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isAncMode
                          ? "bg-pink-500 border-pink-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {isAncMode && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-pink-700 flex items-center gap-2">
                      <Baby size={16} /> Pemeriksaan Kehamilan / ANC / USG
                    </h4>
                  </div>
                  {isAncMode && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            HPHT (Penting!)
                          </label>
                          <input
                            type="date"
                            className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-pink-500"
                            value={ancData.hpht}
                            onChange={(e) =>
                              setAncData({ ...ancData, hpht: e.target.value })
                            }
                          />
                          {calcResult.uk && (
                            <div className="flex items-center justify-between mt-1">
                              <p
                                className={`text-xs font-bold ${
                                  parseInt(calcResult.uk) > 42
                                    ? "text-red-600"
                                    : "text-pink-600"
                                }`}
                              >
                                UK: {calcResult.uk} • HPL: {calcResult.hpl}
                              </p>

                              {parseInt(calcResult.uk) > 42 && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        "Hapus data HPHT lama pasien ini? (Gunakan jika pasien sudah melahirkan)"
                                      )
                                    ) {
                                      await supabase
                                        .from("patients")
                                        .update({ hpht: null })
                                        .eq("id", formData.patient_id);
                                      setAncData((prev) => ({
                                        ...prev,
                                        hpht: "",
                                      }));
                                      alert("Data HPHT berhasil dihapus.");
                                    }
                                  }}
                                  className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md hover:bg-red-200 font-bold"
                                >
                                  Reset HPHT
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            Nama Suami
                          </label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded-xl"
                            value={ancData.husband_name}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                husband_name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            Kehamilan Ke (G)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: G2P1A0"
                            className="w-full p-2 border rounded-xl"
                            value={ancData.gravida}
                            onChange={(e) =>
                              setAncData({ ...ancData, gravida: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            Jenis USG
                          </label>
                          <select
                            className="w-full p-2 border rounded-xl bg-white"
                            value={ancData.usg_type}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                usg_type: e.target.value,
                              })
                            }
                          >
                            <option value="2D">USG 2D</option>
                            <option value="3D">USG 3D</option>
                            <option value="4D">USG 4D</option>
                            <option value="Transvaginal">Transvaginal</option>
                          </select>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-pink-100">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                          <HeartPulse size={12} /> Pemeriksaan Fisik (Leopold &
                          DJJ)
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <input
                            placeholder="Leopold 1"
                            className="p-2 border rounded"
                            value={ancData.leopold1}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                leopold1: e.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="Leopold 2"
                            className="p-2 border rounded"
                            value={ancData.leopold2}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                leopold2: e.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="Leopold 3"
                            className="p-2 border rounded"
                            value={ancData.leopold3}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                leopold3: e.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="Leopold 4"
                            className="p-2 border rounded"
                            value={ancData.leopold4}
                            onChange={(e) =>
                              setAncData({
                                ...ancData,
                                leopold4: e.target.value,
                              })
                            }
                          />
                          <div className="col-span-2">
                            <input
                              placeholder="DJJ (Denyut Jantung Janin)"
                              className="w-full p-2 border rounded"
                              value={ancData.djj}
                              onChange={(e) =>
                                setAncData({ ...ancData, djj: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: PERSALINAN & BBL (LAVENDER / UNGU LEMBUT) */}
                <div className="border border-purple-200 bg-purple-50/70 rounded-xl p-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setIsPersalinanMode(!isPersalinanMode)}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isPersalinanMode
                          ? "bg-purple-600 border-purple-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {isPersalinanMode && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600" /> Pelayanan
                      Persalinan & Bayi Baru Lahir (BBL)
                    </h4>
                  </div>

                  {isPersalinanMode && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                      {/* Pilihan Tempat Persalinan */}
                      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-purple-200 w-fit">
                        <button
                          type="button"
                          onClick={() =>
                            setPersalinanData((p) => ({ ...p, tempat: "TPMB" }))
                          }
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            persalinanData.tempat === "TPMB"
                              ? "bg-purple-600 text-white shadow-sm"
                              : "text-gray-600 hover:text-purple-700"
                          }`}
                        >
                          Bersalin di TPMB
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPersalinanData((p) => ({ ...p, tempat: "LUAR" }))
                          }
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            persalinanData.tempat === "LUAR"
                              ? "bg-purple-600 text-white shadow-sm"
                              : "text-gray-600 hover:text-purple-700"
                          }`}
                        >
                          Bersalin di Tempat Lain
                        </button>
                      </div>

                      {persalinanData.tempat === "TPMB" ? (
                        <>
                          {/* KARTU DATA IBU */}
                          <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-3">
                            <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                              <User size={14} className="text-purple-600" /> Data
                              Persalinan Ibu
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                  Tanggal & Jam Persalinan{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="datetime-local"
                                  required={
                                    isPersalinanMode &&
                                    persalinanData.tempat === "TPMB"
                                  }
                                  className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                  value={persalinanData.delivery_datetime}
                                  onChange={(e) =>
                                    setPersalinanData({
                                      ...persalinanData,
                                      delivery_datetime: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-2 p-2.5 border border-purple-100 rounded-xl bg-purple-50/40 cursor-pointer hover:bg-purple-50">
                                  <input
                                    type="checkbox"
                                    checked={persalinanData.normal}
                                    onChange={(e) =>
                                      setPersalinanData({
                                        ...persalinanData,
                                        normal: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-xs font-bold text-purple-900">
                                    Persalinan Normal (NP)
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Status Rujukan */}
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-4 mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">
                                  Status Rujukan:
                                </span>
                                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                  <input
                                    type="radio"
                                    name="rujuk_opt"
                                    checked={!persalinanData.rujuk}
                                    onChange={() =>
                                      setPersalinanData({
                                        ...persalinanData,
                                        rujuk: false,
                                        tujuan_rujuk: "",
                                      })
                                    }
                                    className="text-purple-600"
                                  />
                                  Tidak Dirujuk
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-red-600">
                                  <input
                                    type="radio"
                                    name="rujuk_opt"
                                    checked={persalinanData.rujuk}
                                    onChange={() =>
                                      setPersalinanData({
                                        ...persalinanData,
                                        rujuk: true,
                                      })
                                    }
                                    className="text-red-600"
                                  />
                                  Dirujuk ke Faskes Lain
                                </label>
                              </div>
                              {persalinanData.rujuk && (
                                <div className="mt-2 animate-in fade-in">
                                  <label className="text-xs font-bold text-red-700 uppercase mb-1 block">
                                    Tujuan Rujukan{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: RSUD Kanjuruhan Kepanjen"
                                    className="w-full p-2 border border-red-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400"
                                    value={persalinanData.tujuan_rujuk}
                                    onChange={(e) =>
                                      setPersalinanData({
                                        ...persalinanData,
                                        tujuan_rujuk: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                Keterangan Persalinan (Opsional)
                              </label>
                              <input
                                type="text"
                                placeholder="Misal: Partus spontan presbel, ketuban jernih, dll."
                                className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                value={persalinanData.keterangan}
                                onChange={(e) =>
                                  setPersalinanData({
                                    ...persalinanData,
                                    keterangan: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* KARTU DATA BAYI (DUKUNGAN ANAK KEMBAR) */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Baby size={14} className="text-purple-600" />{" "}
                                Data Bayi Baru Lahir ({bayiList.length} Bayi)
                              </h5>
                              <button
                                type="button"
                                onClick={handleAddBayi}
                                className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Plus size={13} /> Tambah Bayi (Kembar)
                              </button>
                            </div>

                            {bayiList.map((bayi, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm space-y-3 relative"
                              >
                                <div className="flex items-center justify-between border-b border-purple-50 pb-2">
                                  <span className="font-bold text-xs text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
                                    Bayi #{idx + 1}
                                  </span>
                                  {bayiList.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBayi(idx)}
                                      className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                                    >
                                      <Trash2 size={13} /> Hapus Kartu Ini
                                    </button>
                                  )}
                                </div>

                                {/* Nama & Jenis Kelamin */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">
                                      Nama Bayi{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Nama lengkap / By. Ny. ..."
                                      className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                      value={bayi.nama_bayi}
                                      onChange={(e) =>
                                        handleBayiChange(
                                          idx,
                                          "nama_bayi",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">
                                      Jenis Kelamin{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleBayiChange(
                                            idx,
                                            "jenis_kelamin",
                                            "L"
                                          )
                                        }
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                          bayi.jenis_kelamin === "L"
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                      >
                                        Laki-laki (L)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleBayiChange(
                                            idx,
                                            "jenis_kelamin",
                                            "P"
                                          )
                                        }
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                          bayi.jenis_kelamin === "P"
                                            ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                      >
                                        Perempuan (P)
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Antropometri */}
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                                    Pengukuran Antropometri Bayi
                                  </label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        BBL (gram) *
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="Mis. 3100"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.bbl_gram}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "bbl_gram",
                                            e.target.value
                                          )
                                        }
                                      />
                                      {bayi.bbl_gram &&
                                        parseFloat(bayi.bbl_gram) > 0 &&
                                        parseFloat(bayi.bbl_gram) < 2500 && (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 mt-1">
                                            ⚠️ BBLR — perlu pemantauan
                                          </span>
                                        )}
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        PBL (cm)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Mis. 49"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.pbl_cm}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "pbl_cm",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        LK (cm)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Mis. 33"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.lk_cm}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "lk_cm",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        LD (cm)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Mis. 32"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.ld_cm}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "ld_cm",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Skrining Bayi: PJB (SpO2 Tangan & Kaki) dan SHK */}
                                <div className="pt-2 border-t border-purple-50">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                                    Skrining Klinis Bayi Baru Lahir
                                  </label>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        SpO2 Tangan Kanan (%)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Mis. 98"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.spo2_tangan_kanan}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "spo2_tangan_kanan",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        SpO2 Kaki (%)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Mis. 97"
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.spo2_kaki}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "spo2_kaki",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 block">
                                        Skrining SHK
                                      </label>
                                      <select
                                        className="w-full p-2 border border-gray-200 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={bayi.skrining_shk}
                                        onChange={(e) =>
                                          handleBayiChange(
                                            idx,
                                            "skrining_shk",
                                            e.target.value as any
                                          )
                                        }
                                      >
                                        <option value="">Belum / Pending</option>
                                        <option value="YA">
                                          YA (Sudah Diambil)
                                        </option>
                                        <option value="TIDAK">
                                          TIDAK (Ditolak / Belum)
                                        </option>
                                      </select>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1 italic">
                                    * Skrining Penyakit Jantung Bawaan (PJB)
                                    didasarkan pada kedua angka SpO2 tangan kanan
                                    dan kaki.
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        /* MODE BERSALIN DI LUAR */
                        <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-3">
                          <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 size={14} className="text-purple-600" />{" "}
                            Data Persalinan di Faskes Luar
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                Tanggal Persalinan{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                required={
                                  isPersalinanMode &&
                                  persalinanData.tempat === "LUAR"
                                }
                                className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                value={persalinanData.delivery_datetime.slice(
                                  0,
                                  10
                                )}
                                onChange={(e) =>
                                  setPersalinanData({
                                    ...persalinanData,
                                    delivery_datetime: `${e.target.value}T12:00`,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                Tempat Persalinan{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required={
                                  isPersalinanMode &&
                                  persalinanData.tempat === "LUAR"
                                }
                                placeholder="Misal: RSUD Kanjuruhan, RS Pindad, dll."
                                className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                value={persalinanData.tempat_luar_nama}
                                onChange={(e) =>
                                  setPersalinanData({
                                    ...persalinanData,
                                    tempat_luar_nama: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                              Keterangan (Opsional)
                            </label>
                            <input
                              type="text"
                              placeholder="Catatan persalinan luar, misal: SC atas indikasi PEB, dll."
                              className="w-full p-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                              value={persalinanData.keterangan}
                              onChange={(e) =>
                                setPersalinanData({
                                  ...persalinanData,
                                  keterangan: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* KSPR / RISK LEVEL */}
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    ⚠️ Klasifikasi Status Resiko (KSPR){" "}
                    <span className="text-xs font-normal text-gray-400">
                      (Pilih salah satu)
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {RISK_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex-1 flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.risk_level === level.value
                            ? `bg-${level.color}-50 border-${level.color}-500 ring-1 ring-${level.color}-500`
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="risk_level"
                          value={level.value}
                          checked={formData.risk_level === level.value}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              risk_level: e.target.value,
                            }))
                          }
                          className={`w-4 h-4 text-${level.color}-600 focus:ring-${level.color}-500 border-gray-300`}
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-bold text-gray-800">
                            {level.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {level.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Diagnosa
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border rounded-xl"
                      value={formData.diagnosis}
                      onChange={(e) =>
                        setFormData({ ...formData, diagnosis: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Tindakan
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-xl"
                      value={formData.action}
                      onChange={(e) =>
                        setFormData({ ...formData, action: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* OBAT */}
                <div className="border border-blue-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                      <Plus size={16} /> Resep Obat
                    </h4>
                    {medicineLoadError && recordToEdit?.therapy && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle size={14} className="text-yellow-600" />
                        <div>
                          <strong>Perhatian (Data Lama):</strong> Obat sebelumnya{" "}
                          <i>"{recordToEdit.therapy}"</i> tersimpan sebagai teks
                          biasa. <br />
                          Jika Anda tidak mengubah/menambah obat di bawah ini,
                          teks lama tersebut <strong>tetap tersimpan</strong>.
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <select
                      className="flex-1 p-2 border rounded-lg text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          addMedicineToCart(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">+ Tambah Obat</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Stok: {m.stock}) - Rp {m.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    {selectedMedicines.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm border border-gray-100"
                      >
                        <div className="flex-1">
                          <span className="font-bold text-gray-700">
                            {item.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            Harga Satuan: Rp {item.price}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white border rounded-md">
                            <span className="px-2 text-xs text-gray-400">
                              Qty
                            </span>
                            <input
                              type="number"
                              min="1"
                              className="w-12 p-1 text-center font-bold text-blue-600 outline-none border-l"
                              value={item.qty}
                              onChange={(e) =>
                                updateQty(idx, parseInt(e.target.value))
                              }
                            />
                          </div>
                          <span className="font-bold w-20 text-right">
                            Rp {(item.price * item.qty).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMedicineFromCart(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KEUANGAN & PEMBAYARAN */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-green-800">
                      Biaya Obat (Otomatis)
                    </label>
                    <span className="font-mono font-bold text-gray-700">
                      Rp {medicineTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-green-800">
                      Biaya Jasa
                    </label>
                    <input
                      type="number"
                      className="w-32 p-1 border rounded text-right font-mono text-sm"
                      value={formData.service_fee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          service_fee: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="border-t border-green-300 pt-2 flex justify-between items-center mt-2 mb-4">
                    <label className="text-lg font-bold text-green-900">
                      TOTAL
                    </label>
                    <span className="text-xl font-bold text-green-700">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-green-300 border-dashed">
                    <div>
                      <label className="text-xs font-bold text-green-900 mb-1 block uppercase">
                        Metode Pembayaran
                      </label>
                      <select
                        className="w-full p-2 border border-green-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="CASH">💵 CASH </option>
                        <option value="QRIS">📱 QRIS </option>
                        <option value="BPJS">🏥 BPJS </option>
                        <option value="BKKBN">🏥 BKKBN </option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-green-900 mb-1 block uppercase">
                        Keterangan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: QRIS a.n Suami / Klaim Bulan Ini"
                        className="w-full p-2 border border-green-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* INPUT PETUGAS & TOMBOL */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="w-1/3">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Petugas
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        required
                        className="w-full pl-9 p-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.staff_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            staff_name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 mt-5 shadow-lg shadow-blue-200 transition-all"
                  >
                    {loading ? (
                      "Menyimpan..."
                    ) : (
                      <>
                        <Save size={18} />{" "}
                        {recordToEdit ? "Simpan Perubahan" : "Simpan Data"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ActionModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        type="success"
        title="Berhasil!"
        message={
          recordToEdit
            ? "Data diperbarui. Stok obat dikoreksi & Keuangan disinkronkan."
            : "Pelayanan berhasil disimpan."
        }
      />
    </>
  );
}
