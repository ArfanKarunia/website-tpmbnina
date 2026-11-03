"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  Search, 
  Baby, 
  Calendar, 
  Heart, 
  MessageCircle, 
  AlertTriangle, 
  ArrowLeft, 
  FileText, 
  Building2, 
  X, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Activity,
  UserCheck,
  Plus
} from "lucide-react";
import Link from "next/link";
import AncHistoryModal from "./AncHistoryModal"; 
import { hitungKehamilan, StatusKehamilan } from "@/lib/statusKehamilan";

interface PregnantMom {
  id: string;
  name: string;
  address: string;
  phone: string;
  hpht: string;
  husband_name?: string;
  hpl?: string;
  ukWeeks: number;
  ukDays: number;
  trimester: number;
  status: StatusKehamilan | "TIDAK_HAMIL";
  statusText: string;
}

interface PersalinanBayiItem {
  id: string;
  persalinan_id: string;
  nama_bayi: string | null;
  jenis_kelamin: "L" | "P" | null;
  bbl_gram: number | null;
  pbl_cm: number | null;
  lk_cm: number | null;
  ld_cm: number | null;
  spo2_tangan_kanan: number | null;
  spo2_kaki: number | null;
  skrining_shk: "YA" | "TIDAK" | "Pending" | null;
  diperbarui_oleh?: string | null;
  diperbarui_pada?: string | null;
}

interface PersalinanRecord {
  id: string;
  patient_id: string;
  medical_record_id: string | null;
  hpht_snapshot: string | null;
  delivery_datetime: string;
  tempat: "TPMB" | "LUAR";
  tempat_luar_nama: string | null;
  normal: boolean;
  rujuk: boolean;
  tujuan_rujuk: string | null;
  keterangan: string | null;
  staff_name: string | null;
  diperbarui_oleh?: string | null;
  diperbarui_pada?: string | null;
  patients?: {
    name: string;
    phone?: string;
    address?: string;
    husband_name?: string;
  } | null;
  persalinan_bayi?: PersalinanBayiItem[];
}

interface EditBayiDraft {
  tempId: string;
  id?: string;
  nama_bayi: string;
  jenis_kelamin: "L" | "P";
  bbl_gram: string;
  pbl_cm: string;
  lk_cm: string;
  ld_cm: string;
  spo2_tangan_kanan: number | null;
  spo2_kaki: number | null;
  skrining_shk: "YA" | "TIDAK" | "Pending" | null;
}

export default function KehamilanPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"aktif" | "follow_up" | "koreksi" | "bersalin">("aktif");

  const [moms, setMoms] = useState<PregnantMom[]>([]);
  const [persalinanList, setPersalinanList] = useState<PersalinanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTri, setFilterTri] = useState("all"); 

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedMom, setSelectedMom] = useState<{ id: string; name: string } | null>(null);

  // Modal Tandai Bersalin di Luar
  const [isLuarModalOpen, setIsLuarModalOpen] = useState(false);
  const [selectedMomForLuar, setSelectedMomForLuar] = useState<PregnantMom | null>(null);
  const [luarDate, setLuarDate] = useState("");
  const [luarTempat, setLuarTempat] = useState("");
  const [luarKet, setLuarKet] = useState("");
  const [isSavingLuar, setIsSavingLuar] = useState(false);

  // Helper konversi ISO ke datetime-local (WIB)
  const isoToDateTimeLocal = (isoStr: string | null | undefined): string => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // State Modal Edit Persalinan
  const [editingPersalinan, setEditingPersalinan] = useState<PersalinanRecord | null>(null);
  const [editTempat, setEditTempat] = useState<"TPMB" | "LUAR">("TPMB");
  const [editTempatLuarNama, setEditTempatLuarNama] = useState<string>("");
  const [editDeliveryDateTime, setEditDeliveryDateTime] = useState<string>("");
  const [editNormal, setEditNormal] = useState<boolean>(true);
  const [editRujuk, setEditRujuk] = useState<boolean>(false);
  const [editTujuanRujuk, setEditTujuanRujuk] = useState<string>("");
  const [editKeterangan, setEditKeterangan] = useState<string>("");
  const [editStaffPengubah, setEditStaffPengubah] = useState<string>("");
  const [editBayiList, setEditBayiList] = useState<EditBayiDraft[]>([]);
  const [deletedBabyIds, setDeletedBabyIds] = useState<string[]>([]);
  const [isSavingPersalinan, setIsSavingPersalinan] = useState<boolean>(false);

  // Modal Edit Skrining Bayi
  const [editingBaby, setEditingBaby] = useState<{
    baby: PersalinanBayiItem;
    momName: string;
  } | null>(null);
  const [editSpo2Tangan, setEditSpo2Tangan] = useState<string>("");
  const [editSpo2Kaki, setEditSpo2Kaki] = useState<string>("");
  const [editShk, setEditShk] = useState<string>("Pending");
  const [editStaffName, setEditStaffName] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Ambil data pasien dengan HPHT (pantauan kehamilan aktif, follow-up, dan koreksi)
    const { data: patientsData, error: patErr } = await supabase
      .from("patients")
      .select("*")
      .not("hpht", "is", null)
      .order("hpht", { ascending: false });

    if (patErr) console.error("Error fetching patients:", patErr);

    if (patientsData) {
      const processed: PregnantMom[] = patientsData.map((p) => {
        const calc = hitungKehamilan(p.hpht);
        return {
          id: p.id,
          name: p.name,
          address: p.address || "-",
          phone: p.phone || "",
          hpht: p.hpht,
          husband_name: p.husband_name || "",
          hpl: calc.hplFormatted,
          ukWeeks: calc.ukWeeks,
          ukDays: calc.ukDays,
          trimester: calc.trimester,
          status: calc.status,
          statusText: calc.statusText,
        };
      });
      setMoms(processed);
    }

    // 2. Ambil data persalinan + bayi + pasien
    const { data: persData, error: persErr } = await supabase
      .from("persalinan")
      .select("*, patients(name, phone, address, husband_name), persalinan_bayi(*)")
      .order("delivery_datetime", { ascending: false });

    if (persErr) console.error("Error fetching persalinan:", persErr);
    if (persData) {
      setPersalinanList(persData as PersalinanRecord[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal Bersalin Luar
  const handleOpenLuarModal = (mom: PregnantMom) => {
    setSelectedMomForLuar(mom);
    const today = new Date().toISOString().split("T")[0];
    setLuarDate(today);
    setLuarTempat("");
    setLuarKet("");
    setIsLuarModalOpen(true);
  };

  const handleSaveLuar = async () => {
    if (!selectedMomForLuar) return;
    if (!luarDate) {
      alert("Tanggal persalinan wajib diisi.");
      return;
    }
    if (!luarTempat.trim()) {
      alert("Tempat persalinan di luar wajib diisi (misal: RSUD Kanjuruhan, RS Wava Husada).");
      return;
    }

    const ok = window.confirm(
      "Simpan persalinan akan menyelesaikan kehamilan ini — HPHT dihapus dari pantauan aktif, riwayat tersimpan. Lanjutkan?"
    );
    if (!ok) return;

    setIsSavingLuar(true);
    try {
      const deliveryIso = new Date(`${luarDate}T12:00:00`).toISOString();
      const { error: insertError } = await supabase
        .from("persalinan")
        .insert({
          patient_id: selectedMomForLuar.id,
          hpht_snapshot: selectedMomForLuar.hpht || null,
          medical_record_id: null,
          delivery_datetime: deliveryIso,
          tempat: "LUAR",
          tempat_luar_nama: luarTempat.trim(),
          keterangan: luarKet.trim() || null,
          normal: false,
          rujuk: false,
          staff_name: null,
        });

      if (insertError) {
        console.error("Gagal menyimpan persalinan luar:", insertError);
        alert("Gagal menyimpan data persalinan luar: " + insertError.message);
        setIsSavingLuar(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("patients")
        .update({ hpht: null })
        .eq("id", selectedMomForLuar.id);

      if (updateError) {
        console.error("Gagal mengosongkan HPHT:", updateError);
        alert("Data persalinan tersimpan, namun gagal memperbarui status kehamilan pasien: " + updateError.message);
      } else {
        alert("Persalinan di luar berhasil dicatat. Kehamilan pasien telah diselesaikan.");
      }

      setIsLuarModalOpen(false);
      setSelectedMomForLuar(null);
      await fetchData();
    } catch (err: any) {
      console.error("Error:", err);
      alert("Terjadi kesalahan: " + (err?.message || ""));
    } finally {
      setIsSavingLuar(false);
    }
  };

  // Modal Edit Persalinan Handlers
  const handleOpenEditPersalinan = (rec: PersalinanRecord) => {
    setEditingPersalinan(rec);
    setEditTempat(rec.tempat);
    setEditTempatLuarNama(rec.tempat_luar_nama || "");
    setEditDeliveryDateTime(isoToDateTimeLocal(rec.delivery_datetime));
    setEditNormal(rec.normal ?? true);
    setEditRujuk(rec.rujuk ?? false);
    setEditTujuanRujuk(rec.tujuan_rujuk || "");
    setEditKeterangan(rec.keterangan || "");
    setEditStaffPengubah("");
    setDeletedBabyIds([]);

    const babies: EditBayiDraft[] = (rec.persalinan_bayi || []).map((b, idx) => ({
      tempId: b.id || `existing_${idx}`,
      id: b.id,
      nama_bayi: b.nama_bayi || "",
      jenis_kelamin: (b.jenis_kelamin as "L" | "P") || "L",
      bbl_gram: b.bbl_gram !== null && b.bbl_gram !== undefined ? String(b.bbl_gram) : "",
      pbl_cm: b.pbl_cm !== null && b.pbl_cm !== undefined ? String(b.pbl_cm) : "",
      lk_cm: b.lk_cm !== null && b.lk_cm !== undefined ? String(b.lk_cm) : "",
      ld_cm: b.ld_cm !== null && b.ld_cm !== undefined ? String(b.ld_cm) : "",
      spo2_tangan_kanan: b.spo2_tangan_kanan,
      spo2_kaki: b.spo2_kaki,
      skrining_shk: b.skrining_shk,
    }));

    if (rec.tempat === "TPMB" && babies.length === 0) {
      babies.push({
        tempId: `new_${Date.now()}`,
        nama_bayi: `Bayi Ny. ${rec.patients?.name || ""}`,
        jenis_kelamin: "L",
        bbl_gram: "",
        pbl_cm: "",
        lk_cm: "",
        ld_cm: "",
        spo2_tangan_kanan: null,
        spo2_kaki: null,
        skrining_shk: null,
      });
    }

    setEditBayiList(babies);
  };

  const handleToggleTempat = (targetTempat: "TPMB" | "LUAR") => {
    if (targetTempat === editTempat) return;
    if (editTempat === "TPMB" && targetTempat === "LUAR") {
      const ok = window.confirm(
        "Ubah ke LUAR akan menghapus seluruh data bayi yang tersimpan untuk persalinan ini."
      );
      if (!ok) return;
      const toDelete = editBayiList.filter((b) => b.id).map((b) => b.id as string);
      setDeletedBabyIds((prev) => Array.from(new Set([...prev, ...toDelete])));
      setEditBayiList([]);
      setEditTempat("LUAR");
    } else if (editTempat === "LUAR" && targetTempat === "TPMB") {
      setEditTempat("TPMB");
      if (editBayiList.length === 0) {
        setEditBayiList([
          {
            tempId: `new_${Date.now()}`,
            nama_bayi: `Bayi Ny. ${editingPersalinan?.patients?.name || ""}`,
            jenis_kelamin: "L",
            bbl_gram: "",
            pbl_cm: "",
            lk_cm: "",
            ld_cm: "",
            spo2_tangan_kanan: null,
            spo2_kaki: null,
            skrining_shk: null,
          },
        ]);
      }
    }
  };

  const handleAddEditBayi = () => {
    setEditBayiList((prev) => [
      ...prev,
      {
        tempId: `new_${Date.now()}_${prev.length}`,
        nama_bayi: `Bayi ${prev.length + 1}`,
        jenis_kelamin: "L",
        bbl_gram: "",
        pbl_cm: "",
        lk_cm: "",
        ld_cm: "",
        spo2_tangan_kanan: null,
        spo2_kaki: null,
        skrining_shk: null,
      },
    ]);
  };

  const handleDeleteEditBayi = (index: number) => {
    if (editBayiList.length <= 1) {
      alert("Minimal harus ada satu data bayi untuk persalinan di TPMB.");
      return;
    }
    const baby = editBayiList[index];
    if (baby.id) {
      setDeletedBabyIds((prev) => [...prev, baby.id as string]);
    }
    setEditBayiList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBabyField = (
    index: number,
    field: keyof EditBayiDraft,
    value: any
  ) => {
    setEditBayiList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveEditPersalinan = async () => {
    if (!editingPersalinan) return;

    if (!editStaffPengubah.trim()) {
      alert("Nama staff pengubah wajib diisi untuk riwayat audit.");
      return;
    }
    if (!editDeliveryDateTime) {
      alert("Waktu persalinan wajib diisi.");
      return;
    }

    const deliveryDateObj = new Date(editDeliveryDateTime);
    if (isNaN(deliveryDateObj.getTime())) {
      alert("Format waktu persalinan tidak valid.");
      return;
    }
    const deliveryIso = deliveryDateObj.toISOString();

    const isTpmb = editTempat === "TPMB";
    if (!isTpmb) {
      if (!editTempatLuarNama.trim()) {
        alert("Nama tempat persalinan luar wajib diisi.");
        return;
      }
    } else {
      if (editBayiList.length === 0) {
        alert("Minimal harus ada satu data bayi untuk persalinan di TPMB.");
        return;
      }
      for (let i = 0; i < editBayiList.length; i++) {
        const b = editBayiList[i];
        if (!b.nama_bayi.trim()) {
          alert(`Nama bayi ke-${i + 1} wajib diisi.`);
          return;
        }
        if (!b.jenis_kelamin) {
          alert(`Jenis kelamin bayi ke-${i + 1} wajib dipilih.`);
          return;
        }
        if (!b.bbl_gram || isNaN(parseFloat(b.bbl_gram)) || parseFloat(b.bbl_gram) <= 0) {
          alert(`Berat Badan Lahir (BBL) bayi ke-${i + 1} wajib diisi angka positif.`);
          return;
        }
      }
    }

    setIsSavingPersalinan(true);
    const nowIso = new Date().toISOString();
    const staffName = editStaffPengubah.trim();

    try {
      // 1. UPDATE baris persalinan
      const { error: persError } = await supabase
        .from("persalinan")
        .update({
          tempat: editTempat,
          tempat_luar_nama: isTpmb ? null : editTempatLuarNama.trim(),
          normal: isTpmb ? editNormal : false,
          rujuk: editRujuk,
          tujuan_rujuk: editRujuk ? (editTujuanRujuk.trim() || null) : null,
          keterangan: editKeterangan.trim() || null,
          delivery_datetime: deliveryIso,
          diperbarui_oleh: staffName,
          diperbarui_pada: nowIso,
        })
        .eq("id", editingPersalinan.id);

      if (persError) {
        throw new Error(`Gagal memperbarui data persalinan: ${persError.message}`);
      }

      // 2. Tangani bayi
      if (!isTpmb) {
        const { error: delAllErr } = await supabase
          .from("persalinan_bayi")
          .delete()
          .eq("persalinan_id", editingPersalinan.id);

        if (delAllErr) {
          throw new Error(`Gagal membersihkan data bayi: ${delAllErr.message}`);
        }
      } else {
        if (deletedBabyIds.length > 0) {
          const { error: delErr } = await supabase
            .from("persalinan_bayi")
            .delete()
            .in("id", deletedBabyIds);

          if (delErr) {
            throw new Error(`Gagal menghapus bayi: ${delErr.message}`);
          }
        }

        for (const b of editBayiList) {
          const bbl = b.bbl_gram ? parseFloat(b.bbl_gram) : null;
          const pbl = b.pbl_cm ? parseFloat(b.pbl_cm) : null;
          const lk = b.lk_cm ? parseFloat(b.lk_cm) : null;
          const ld = b.ld_cm ? parseFloat(b.ld_cm) : null;

          if (b.id) {
            const { error: updBayiErr } = await supabase
              .from("persalinan_bayi")
              .update({
                nama_bayi: b.nama_bayi.trim(),
                jenis_kelamin: b.jenis_kelamin,
                bbl_gram: bbl,
                pbl_cm: pbl,
                lk_cm: lk,
                ld_cm: ld,
                diperbarui_oleh: staffName,
                diperbarui_pada: nowIso,
              })
              .eq("id", b.id);

            if (updBayiErr) {
              throw new Error(`Gagal memperbarui data bayi (${b.nama_bayi}): ${updBayiErr.message}`);
            }
          } else {
            const { error: insBayiErr } = await supabase
              .from("persalinan_bayi")
              .insert({
                persalinan_id: editingPersalinan.id,
                nama_bayi: b.nama_bayi.trim(),
                jenis_kelamin: b.jenis_kelamin,
                bbl_gram: bbl,
                pbl_cm: pbl,
                lk_cm: lk,
                ld_cm: ld,
                spo2_tangan_kanan: b.spo2_tangan_kanan,
                spo2_kaki: b.spo2_kaki,
                skrining_shk: b.skrining_shk,
                diperbarui_oleh: staffName,
                diperbarui_pada: nowIso,
              });

            if (insBayiErr) {
              throw new Error(`Gagal menambahkan bayi baru (${b.nama_bayi}): ${insBayiErr.message}`);
            }
          }
        }
      }

      alert("Data persalinan berhasil diperbarui.");
      setEditingPersalinan(null);
      await fetchData();
    } catch (err: any) {
      console.error("Error saving edit persalinan:", err);
      alert("Terjadi kesalahan: " + (err?.message || ""));
    } finally {
      setIsSavingPersalinan(false);
    }
  };

  // Modal Edit Skrining Bayi
  const handleOpenEditBaby = (baby: PersalinanBayiItem, momName: string) => {
    setEditingBaby({ baby, momName });
    setEditSpo2Tangan(baby.spo2_tangan_kanan !== null ? String(baby.spo2_tangan_kanan) : "");
    setEditSpo2Kaki(baby.spo2_kaki !== null ? String(baby.spo2_kaki) : "");
    setEditShk(baby.skrining_shk || "Pending");
    setEditStaffName("");
  };

  const handleSaveEditBaby = async () => {
    if (!editingBaby) return;
    if (!editStaffName.trim()) {
      alert("Nama staff pengubah wajib diisi untuk riwayat audit.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const spo2TanganVal = editSpo2Tangan.trim() !== "" ? parseFloat(editSpo2Tangan) : null;
      const spo2KakiVal = editSpo2Kaki.trim() !== "" ? parseFloat(editSpo2Kaki) : null;
      const shkVal = editShk === "Pending" ? null : (editShk as "YA" | "TIDAK");

      const { error } = await supabase
        .from("persalinan_bayi")
        .update({
          spo2_tangan_kanan: spo2TanganVal,
          spo2_kaki: spo2KakiVal,
          skrining_shk: shkVal,
          diperbarui_oleh: editStaffName.trim(),
          diperbarui_pada: new Date().toISOString(),
        })
        .eq("id", editingBaby.baby.id);

      if (error) {
        console.error("Gagal memperbarui skrining bayi:", error);
        alert("Gagal memperbarui skrining bayi: " + error.message);
        return;
      }

      alert("Hasil skrining bayi berhasil diperbarui.");
      setEditingBaby(null);
      await fetchData();
    } catch (err: any) {
      console.error("Error:", err);
      alert("Terjadi kesalahan: " + (err?.message || ""));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Hapus Riwayat Persalinan
  const handleDeletePersalinan = async (record: PersalinanRecord) => {
    const momName = record.patients?.name || "pasien";
    const ok = window.confirm(
      `PERINGATAN: Menghapus data persalinan ${momName} akan menghapus riwayat persalinan dan seluruh data bayi terkait secara permanen.\n\nTindakan ini TIDAK mengembalikan HPHT pasien (pasien tetap tercatat sudah selesai hamil).\n\nLanjutkan penghapusan?`
    );
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("persalinan")
        .delete()
        .eq("id", record.id);

      if (error) {
        console.error("Gagal menghapus persalinan:", error);
        alert("Gagal menghapus riwayat persalinan: " + error.message);
        return;
      }

      alert("Riwayat persalinan berhasil dihapus.");
      await fetchData();
    } catch (err: any) {
      console.error("Error:", err);
      alert("Terjadi kesalahan: " + (err?.message || ""));
    }
  };

  const handleOpenHistory = (mom: { id: string; name: string }) => {
    setSelectedMom({ id: mom.id, name: mom.name });
    setIsHistoryOpen(true);
  };

  // Filter groups
  const aktifMoms = moms.filter((m) => m.status === "HAMIL_AKTIF");
  const followUpMoms = moms.filter((m) => m.status === "PERLU_FOLLOW_UP");
  const koreksiMoms = moms.filter((m) => m.status === "PERLU_KOREKSI");

  const filteredAktif = aktifMoms.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterTri === "t1") matchFilter = m.trimester === 1;
    if (filterTri === "t2") matchFilter = m.trimester === 2;
    if (filterTri === "t3") matchFilter = m.trimester === 3;
    if (filterTri === "risk") matchFilter = m.ukWeeks >= 37;
    return matchSearch && matchFilter;
  });

  const filteredFollowUp = followUpMoms.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredKoreksi = koreksiMoms.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBersalin = persalinanList.filter((p) => {
    const q = searchTerm.toLowerCase();
    const momNameMatch = (p.patients?.name || "").toLowerCase().includes(q);
    const babyNameMatch = (p.persalinan_bayi || []).some((b) =>
      (b.nama_bayi || "").toLowerCase().includes(q)
    );
    return momNameMatch || babyNameMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Hub Kehamilan & Persalinan</h1>
          </div>
          <p className="text-gray-500 text-sm ml-7">
            Kelola perjalanan kehamilan terpadu: monitor ANC, peringatan tindak lanjut, koreksi HPHT, hingga riwayat persalinan & BBL.
          </p>
        </div>
      </div>

      {/* TABS UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("aktif")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === "aktif"
              ? "bg-pink-600 text-white border-pink-600 shadow-md"
              : "bg-white border-pink-100 hover:border-pink-300 text-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Hamil Aktif</span>
            <Baby size={18} className="opacity-80" />
          </div>
          <div className="text-2xl font-bold mt-2">{aktifMoms.length}</div>
          <span className="text-[11px] opacity-80">Dalam rentang kehamilan aktif</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("follow_up")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === "follow_up"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white border-amber-200 hover:border-amber-400 text-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Perlu Follow-up</span>
            <Clock size={18} className="opacity-80" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${activeTab === "follow_up" ? "text-white" : "text-amber-600"}`}>
            {followUpMoms.length}
          </div>
          <span className="text-[11px] opacity-80">UK ≥ 41 minggu (lewat HPL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("koreksi")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === "koreksi"
              ? "bg-red-600 text-white border-red-600 shadow-md"
              : "bg-white border-red-100 hover:border-red-300 text-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Perlu Koreksi</span>
            <AlertCircle size={18} className="opacity-80" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${activeTab === "koreksi" ? "text-white" : "text-red-500"}`}>
            {koreksiMoms.length}
          </div>
          <span className="text-[11px] opacity-80">HPHT masa depan / UK negatif</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bersalin")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === "bersalin"
              ? "bg-purple-600 text-white border-purple-600 shadow-md"
              : "bg-white border-purple-100 hover:border-purple-300 text-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Sudah Bersalin</span>
            <CheckCircle2 size={18} className="opacity-80" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${activeTab === "bersalin" ? "text-white" : "text-purple-600"}`}>
            {persalinanList.length}
          </div>
          <span className="text-[11px] opacity-80">Arsip persalinan & skrining BBL</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={
              activeTab === "bersalin"
                ? "Cari nama ibu atau nama bayi yang telah bersalin..."
                : "Cari nama ibu hamil..."
            }
            className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Sub-filter trimester hanya untuk tab aktif */}
        {activeTab === "aktif" && (
          <div className="flex gap-1.5 shrink-0 overflow-x-auto w-full md:w-auto">
            <button
              type="button"
              onClick={() => setFilterTri("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTri === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterTri("risk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTri === "risk" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              Siaga (37+)
            </button>
            <button
              type="button"
              onClick={() => setFilterTri("t1")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTri === "t1" ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              T1
            </button>
            <button
              type="button"
              onClick={() => setFilterTri("t2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTri === "t2" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              }`}
            >
              T2
            </button>
            <button
              type="button"
              onClick={() => setFilterTri("t3")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTri === "t3" ? "bg-purple-500 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
              }`}
            >
              T3
            </button>
          </div>
        )}
      </div>

      {/* CONTENT PER TAB */}
      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : (
        <>
          {/* TAB 1: HAMIL AKTIF */}
          {activeTab === "aktif" && (
            <div>
              {filteredAktif.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAktif.map((mom) => (
                    <div
                      key={mom.id}
                      className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                        mom.ukWeeks >= 37 ? "border-red-200" : "border-gray-200"
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Baby size={80} className="text-pink-500" />
                      </div>

                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{mom.name}</h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Heart size={10} className="text-red-400" /> Suami: {mom.husband_name || "-"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            mom.ukWeeks >= 37
                              ? "bg-red-100 text-red-600 animate-pulse"
                              : "bg-pink-100 text-pink-600"
                          }`}
                        >
                          {mom.ukWeeks >= 37 ? "SIAGA" : `Trimester ${mom.trimester}`}
                        </span>
                      </div>

                      <div className="bg-pink-50/50 rounded-xl p-3 mb-4 border border-pink-100 relative z-10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Usia Kehamilan</span>
                          <span className="text-base font-bold text-pink-700">
                            {mom.ukWeeks} Minggu {mom.ukDays > 0 ? `${mom.ukDays} Hari` : ""}
                          </span>
                        </div>
                        <div className="w-full bg-pink-100 rounded-full h-1.5">
                          <div
                            className="bg-pink-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((mom.ukWeeks / 40) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">HPL (Estimasi)</span>
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Calendar size={12} /> {mom.hpl}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 relative z-10">
                        <a
                          href={`https://wa.me/${mom.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-50 text-green-700 py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100 transition-colors text-center"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle size={13} className="shrink-0" /> <span className="truncate">WA</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenHistory(mom)}
                          className="border border-gray-200 text-gray-600 py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors text-center"
                          title="Lihat Riwayat ANC"
                        >
                          <FileText size={13} className="shrink-0" /> <span className="truncate">Riwayat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenLuarModal(mom)}
                          className="bg-purple-50 text-purple-700 border border-purple-200 py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors text-center"
                          title="Tandai persalinan di faskes luar (RS/Puskesmas/dll)"
                        >
                          <Building2 size={13} className="shrink-0" /> <span className="truncate">Bersalin Luar</span>
                        </button>
                      </div>

                      {mom.ukWeeks >= 37 && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Pasien sudah mendekati HPL. Siapkan rujukan bila ada tanda bahaya.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                  <Baby size={48} className="mx-auto mb-3 text-gray-300" />
                  <h3 className="text-gray-800 font-bold">Tidak ada ibu hamil aktif ditemukan</h3>
                  <p className="text-gray-500 text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter trimester.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERLU FOLLOW-UP */}
          {activeTab === "follow_up" && (
            <div>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Perhatian Klinis:</strong> Pasien di tab ini memiliki usia kehamilan ≥ 41 minggu tanpa catatan persalinan. Hubungi pasien untuk memastikan apakah telah bersalin di faskes luar atau memerlukan rujukan segera.
                </span>
              </div>

              {filteredFollowUp.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFollowUp.map((mom) => (
                    <div
                      key={mom.id}
                      className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{mom.name}</h3>
                          <p className="text-xs text-gray-500">Suami: {mom.husband_name || "-"}</p>
                          <p className="text-xs text-gray-400">{mom.address}</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                          FOLLOW-UP
                        </span>
                      </div>

                      <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-amber-950">
                          <span>Usia Kehamilan:</span>
                          <span className="text-sm text-red-600">{mom.ukWeeks} Minggu {mom.ukDays > 0 ? `${mom.ukDays} Hari` : ""}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>HPHT:</span>
                          <span>{mom.hpht}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>HPL Estimasi:</span>
                          <span className="font-semibold">{mom.hpl}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-semibold">
                          ⚠️ Melewati HPL — Konfirmasi status persalinan pasien
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <a
                          href={`https://wa.me/${mom.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-50 text-green-700 py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100 transition-colors text-center"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle size={13} className="shrink-0" /> <span className="truncate">Hubungi</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenHistory(mom)}
                          className="border border-gray-200 text-gray-600 py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors text-center"
                          title="Lihat Riwayat ANC"
                        >
                          <FileText size={13} className="shrink-0" /> <span className="truncate">Riwayat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenLuarModal(mom)}
                          className="bg-purple-600 text-white py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-700 transition-colors text-center shadow-sm"
                          title="Tandai persalinan di luar"
                        >
                          <Building2 size={13} className="shrink-0" /> <span className="truncate">Bersalin Luar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
                  <h3 className="text-gray-800 font-bold">Semua pemantauan terkendali</h3>
                  <p className="text-gray-500 text-xs mt-1">Tidak ada pasien dengan usia kehamilan ≥ 41 minggu yang tertunda tindak lanjut.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERLU KOREKSI */}
          {activeTab === "koreksi" && (
            <div>
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>
                  <strong>Perhatian Data:</strong> Pasien di tab ini memiliki HPHT yang menghasilkan usia kehamilan negatif (tanggal HPHT di masa depan atau salah entri). Periksa dan perbaiki HPHT melalui menu Pasien.
                </span>
              </div>

              {filteredKoreksi.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredKoreksi.map((mom) => (
                    <div
                      key={mom.id}
                      className="bg-white p-5 rounded-2xl border-2 border-red-300 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{mom.name}</h3>
                          <p className="text-xs text-gray-500">Suami: {mom.husband_name || "-"}</p>
                          <p className="text-xs text-gray-400">{mom.address}</p>
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                          SALAH INPUT
                        </span>
                      </div>

                      <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-red-900">
                          <span>HPHT Tercatat:</span>
                          <span className="text-sm underline">{mom.hpht}</span>
                        </div>
                        <div className="flex justify-between text-red-700">
                          <span>Status Hitung:</span>
                          <span>UK Negatif ({mom.ukWeeks} Mgu)</span>
                        </div>
                        <p className="text-[11px] text-red-800 mt-2 pt-2 border-t border-red-200">
                          ⚠️ Tanggal HPHT tercatat berada di masa depan. Silakan koreksi tanggal HPHT pada data rekam pasien.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/pasien?search=${encodeURIComponent(mom.name)}`}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Edit3 size={14} /> Koreksi Data Pasien
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(mom)}
                          className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50"
                        >
                          Riwayat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
                  <h3 className="text-gray-800 font-bold">Data HPHT Bersih</h3>
                  <p className="text-gray-500 text-xs mt-1">Tidak ditemukan pasien dengan tanggal HPHT tidak valid / negatif.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUDAH BERSALIN */}
          {activeTab === "bersalin" && (
            <div>
              {filteredBersalin.length > 0 ? (
                <div className="space-y-4">
                  {filteredBersalin.map((rec) => {
                    const momName = rec.patients?.name || "Pasien Tidak Diketahui";
                    const momHusband = rec.patients?.husband_name || "-";
                    const momPhone = rec.patients?.phone;
                    const momAddress = rec.patients?.address || "-";
                    const isTpbm = rec.tempat === "TPMB";
                    const deliveryDate = new Date(rec.delivery_datetime);
                    const formattedDate = isNaN(deliveryDate.getTime())
                      ? rec.delivery_datetime
                      : deliveryDate.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB";

                    const babies = rec.persalinan_bayi || [];

                    return (
                      <div
                        key={rec.id}
                        className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5 hover:shadow-md transition-all space-y-4"
                      >
                        {/* Header Kartu Persalinan */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-lg">{momName}</h3>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isTpbm
                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {isTpbm ? "DI TPMB" : `LUAR: ${rec.tempat_luar_nama || "-"}`}
                              </span>
                              {isTpbm && rec.normal && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  ✓ Normal Pervaginam (NP)
                                </span>
                              )}
                              {rec.rujuk && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Rujuk ke: {rec.tujuan_rujuk || "Faskes Rujukan"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Suami: <strong>{momHusband}</strong> | Alamat: {momAddress}
                              {momPhone && ` | Telp: ${momPhone}`}
                            </p>
                            <p className="text-xs text-purple-800 font-medium mt-0.5 flex items-center gap-1">
                              <Calendar size={12} /> Waktu Persalinan: {formattedDate}
                              {rec.staff_name && ` (Penolong/Bidan: ${rec.staff_name})`}
                            </p>
                            {rec.diperbarui_oleh && (
                              <p className="text-[11px] text-purple-700 italic mt-0.5">
                                Terakhir diedit oleh: <strong>{rec.diperbarui_oleh}</strong>
                                {rec.diperbarui_pada &&
                                  ` (${new Date(rec.diperbarui_pada).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })} WIB)`}
                              </p>
                            )}
                            {rec.keterangan && (
                              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mt-2 border border-gray-100">
                                <em>Catatan:</em> {rec.keterangan}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {momPhone && (
                              <a
                                href={`https://wa.me/${momPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1 border border-green-200"
                              >
                                <MessageCircle size={13} /> WA
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditPersalinan(rec)}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg flex items-center gap-1 border border-purple-200 transition-colors"
                              title="Edit data persalinan & bayi"
                            >
                              <Edit3 size={13} /> Edit Persalinan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePersalinan(rec)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg flex items-center gap-1 border border-red-200 transition-colors"
                              title="Hapus riwayat persalinan ini"
                            >
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        </div>

                        {/* Rincian Bayi Baru Lahir */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Baby size={14} className="text-purple-600" />
                            Data Bayi Baru Lahir ({babies.length} Bayi)
                          </h4>

                          {babies.length === 0 ? (
                            <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                              Tidak ada rincian data bayi dicatat (persalinan di faskes luar).
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {babies.map((baby, idx) => {
                                const isBblr = (baby.bbl_gram || 0) < 2500 && (baby.bbl_gram || 0) > 0;
                                const shkStatus = baby.skrining_shk;

                                return (
                                  <div
                                    key={baby.id}
                                    className="bg-purple-50/40 rounded-xl p-3.5 border border-purple-100 text-xs space-y-2 relative"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-bold text-gray-800 text-sm">
                                          {baby.nama_bayi || `Bayi ${idx + 1}`}
                                        </span>
                                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                                          {baby.jenis_kelamin === "L" ? "Laki-laki" : baby.jenis_kelamin === "P" ? "Perempuan" : "-"}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditBaby(baby, momName)}
                                        className="text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-md border border-purple-200 font-bold text-[11px] flex items-center gap-1 shadow-2xs hover:bg-purple-50 transition-colors"
                                      >
                                        <Edit3 size={11} /> Edit Skrining
                                      </button>
                                    </div>

                                    {/* Antropometri */}
                                    <div className="grid grid-cols-4 gap-1.5 text-center bg-white p-2 rounded-lg border border-purple-100">
                                      <div>
                                        <span className="block text-[10px] text-gray-400">BBL</span>
                                        <span className={`font-bold ${isBblr ? "text-red-600" : "text-gray-800"}`}>
                                          {baby.bbl_gram ? `${baby.bbl_gram}g` : "-"}
                                        </span>
                                        {isBblr && (
                                          <span className="block text-[8px] font-black text-red-600 uppercase">
                                            BBLR
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <span className="block text-[10px] text-gray-400">PBL</span>
                                        <span className="font-bold text-gray-800">
                                          {baby.pbl_cm ? `${baby.pbl_cm}cm` : "-"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-[10px] text-gray-400">LK</span>
                                        <span className="font-bold text-gray-800">
                                          {baby.lk_cm ? `${baby.lk_cm}cm` : "-"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-[10px] text-gray-400">LD</span>
                                        <span className="font-bold text-gray-800">
                                          {baby.ld_cm ? `${baby.ld_cm}cm` : "-"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Skrining PJB & SHK */}
                                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                                      <div className="bg-white p-2 rounded-lg border border-purple-100">
                                        <span className="font-semibold text-gray-600 block mb-0.5">
                                          Skrining PJB (SpO2):
                                        </span>
                                        <div className="text-[10px] text-gray-700 space-y-0.5">
                                          <div>Tangan Kanan: <strong>{baby.spo2_tangan_kanan != null ? `${baby.spo2_tangan_kanan}%` : "-"}</strong></div>
                                          <div>Kaki: <strong>{baby.spo2_kaki != null ? `${baby.spo2_kaki}%` : "-"}</strong></div>
                                        </div>
                                      </div>

                                      <div className="bg-white p-2 rounded-lg border border-purple-100 flex flex-col justify-between">
                                        <span className="font-semibold text-gray-600 block mb-0.5">
                                          Skrining SHK:
                                        </span>
                                        <div>
                                          {shkStatus === "YA" ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                              ✓ Dilakukan (YA)
                                            </span>
                                          ) : shkStatus === "TIDAK" ? (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                                              ✕ Tidak
                                            </span>
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                              ⏳ Menunggu hasil Puskesmas
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {baby.diperbarui_oleh && (
                                      <p className="text-[10px] text-gray-400 italic pt-1">
                                        Diperbarui oleh: {baby.diperbarui_oleh}{" "}
                                        {baby.diperbarui_pada &&
                                          `pada ${new Date(baby.diperbarui_pada).toLocaleDateString("id-ID")}`}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                  <Baby size={48} className="mx-auto mb-3 text-purple-300" />
                  <h3 className="text-gray-800 font-bold">Belum ada riwayat persalinan tercatat</h3>
                  <p className="text-gray-500 text-xs mt-1">Data persalinan akan otomatis terarsipkan di sini setelah disimpan dari form Pelayanan atau tombol Bersalin Luar.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL RIWAYAT ANC */}
      <AncHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        patientId={selectedMom?.id || null}
        patientName={selectedMom?.name || ""}
      />

      {/* MODAL TANDAI BERSALIN DI LUAR */}
      {isLuarModalOpen && selectedMomForLuar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="text-purple-600" size={20} />
                <h3 className="font-bold text-gray-800">Tandai Bersalin di Luar</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSavingLuar) {
                    setIsLuarModalOpen(false);
                    setSelectedMomForLuar(null);
                  }
                }}
                disabled={isSavingLuar}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
              <p className="font-semibold text-sm text-purple-950">{selectedMomForLuar.name}</p>
              <div className="flex justify-between">
                <span>HPHT: {selectedMomForLuar.hpht || "-"}</span>
                <span>UK: {selectedMomForLuar.ukWeeks} Mgu {selectedMomForLuar.ukDays > 0 ? `${selectedMomForLuar.ukDays} Hr` : ""}</span>
              </div>
              <p className="text-[11px] text-purple-700">
                Suami: {selectedMomForLuar.husband_name || "-"} | HPL: {selectedMomForLuar.hpl || "-"}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tanggal Persalinan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={luarDate}
                  onChange={(e) => setLuarDate(e.target.value)}
                  disabled={isSavingLuar}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tempat Persalinan (Faskes Luar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: RSUD Kanjuruhan, RS Wava Husada"
                  value={luarTempat}
                  onChange={(e) => setLuarTempat(e.target.value)}
                  disabled={isSavingLuar}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan rujukan, kondisi bayi, dll (bila ada)..."
                  value={luarKet}
                  onChange={(e) => setLuarKet(e.target.value)}
                  disabled={isSavingLuar}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠️ <strong>Perhatian:</strong> Menyimpan persalinan ini akan menghapus HPHT aktif pasien sehingga kartu kehamilan tidak lagi muncul di daftar pantauan. Riwayat persalinan tetap tersimpan rapi.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsLuarModalOpen(false);
                  setSelectedMomForLuar(null);
                }}
                disabled={isSavingLuar}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveLuar}
                disabled={isSavingLuar}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isSavingLuar ? "Menyimpan..." : "Simpan Persalinan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SKRINING BAYI */}
      {editingBaby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-purple-600" size={20} />
                <h3 className="font-bold text-gray-800">Edit Hasil Skrining Bayi</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSavingEdit) setEditingBaby(null);
                }}
                disabled={isSavingEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-900">
              <p className="font-semibold text-sm text-purple-950">
                {editingBaby.baby.nama_bayi || "Bayi Baru Lahir"}
              </p>
              <p className="text-purple-700">Ibu: {editingBaby.momName}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    SpO2 Tangan Kanan (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 98"
                    value={editSpo2Tangan}
                    onChange={(e) => setEditSpo2Tangan(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    SpO2 Kaki (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 97"
                    value={editSpo2Kaki}
                    onChange={(e) => setEditSpo2Kaki(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Skrining SHK (Hipotiroid Kongenital)
                </label>
                <select
                  value={editShk}
                  onChange={(e) => setEditShk(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                >
                  <option value="Pending">Pending (Menunggu hasil Puskesmas)</option>
                  <option value="YA">Dilakukan (YA)</option>
                  <option value="TIDAK">Tidak Dilakukan (TIDAK)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <UserCheck size={14} className="text-purple-600" />
                  Nama Staff Pengubah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama staff (cth: Bidan Nina)"
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Wajib diisi untuk riwayat audit siapa yang memperbarui hasil skrining.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingBaby(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditBaby}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA PERSALINAN */}
      {editingPersalinan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Building2 className="text-purple-600" size={20} />
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Edit Data Persalinan</h3>
                  <p className="text-xs text-gray-500">
                    Ibu: <strong>{editingPersalinan.patients?.name}</strong> | Suami: {editingPersalinan.patients?.husband_name || "-"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSavingPersalinan) setEditingPersalinan(null);
                }}
                disabled={isSavingPersalinan}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
              
              {/* Bagian 1: Tempat & Waktu Persalinan */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  1. Tempat & Waktu Persalinan
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Lokasi Persalinan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleTempat("TPMB")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        editTempat === "TPMB"
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Di TPMB Nina Rahayu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTempat("LUAR")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        editTempat === "LUAR"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Di Luar TPMB (Faskes Rujukan)
                    </button>
                  </div>
                </div>

                {editTempat === "LUAR" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nama Faskes Luar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: RSUD Kanjuruhan, RS Wava Husada"
                      value={editTempatLuarNama}
                      onChange={(e) => setEditTempatLuarNama(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal & Jam Persalinan (WIB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editDeliveryDateTime}
                    onChange={(e) => setEditDeliveryDateTime(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Waktu diinput sesuai jam lokal WIB (misal 10:00 WIB). Sistem otomatis menyinkronkan format database.
                  </p>
                </div>
              </div>

              {/* Bagian 2: Kondisi Klinis & Rujukan */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  2. Kondisi Klinis & Rujukan
                </h4>

                {editTempat === "TPMB" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-np"
                      checked={editNormal}
                      onChange={(e) => setEditNormal(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="edit-np" className="text-xs font-medium text-gray-800">
                      Persalinan Normal Pervaginam (NP)
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-rujuk"
                    checked={editRujuk}
                    onChange={(e) => setEditRujuk(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="edit-rujuk" className="text-xs font-medium text-gray-800">
                    Kasus Rujukan ke Fasilitas Lain
                  </label>
                </div>

                {editRujuk && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tujuan Rujukan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: RSUD Kanjuruhan Kepanjen"
                      value={editTujuanRujuk}
                      onChange={(e) => setEditTujuanRujuk(e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Keterangan Tambahan / Catatan Klinis (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Catatan kondisi ibu/bayi, indikasi rujukan, dll..."
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Bagian 3: Data Bayi Baru Lahir (Hanya jika TPMB) */}
              {editTempat === "TPMB" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Baby size={15} className="text-purple-600" />
                      3. Data Bayi Baru Lahir ({editBayiList.length} Bayi)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEditBayi}
                      className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Tambah Bayi (Kembar)
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editBayiList.map((baby, idx) => {
                      const bblNum = parseFloat(baby.bbl_gram);
                      const isBblr = !isNaN(bblNum) && bblNum > 0 && bblNum < 2500;

                      return (
                        <div
                          key={baby.tempId}
                          className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                            <span className="font-bold text-xs text-purple-900">
                              Bayi #{idx + 1}
                            </span>
                            {editBayiList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEditBayi(idx)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Hapus Kartu Ini
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Nama Bayi <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Nama bayi..."
                                value={baby.nama_bayi}
                                onChange={(e) => handleUpdateBabyField(idx, "nama_bayi", e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Jenis Kelamin <span className="text-red-500">*</span>
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBabyField(idx, "jenis_kelamin", "L")}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                                    baby.jenis_kelamin === "L"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-white text-gray-700 border-gray-200"
                                  }`}
                                >
                                  Laki-laki (L)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBabyField(idx, "jenis_kelamin", "P")}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                                    baby.jenis_kelamin === "P"
                                      ? "bg-pink-600 text-white border-pink-600"
                                      : "bg-white text-gray-700 border-gray-200"
                                  }`}
                                >
                                  Perempuan (P)
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Antropometri Bayi */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-semibold text-gray-700">
                                  BBL (gram) <span className="text-red-500">*</span>
                                </label>
                                {isBblr && (
                                  <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded">
                                    BBLR
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                placeholder="cth: 3100"
                                value={baby.bbl_gram}
                                onChange={(e) => handleUpdateBabyField(idx, "bbl_gram", e.target.value)}
                                className={`w-full border rounded-lg p-2 text-sm focus:outline-none bg-white ${
                                  isBblr ? "border-red-300 focus:ring-2 focus:ring-red-400" : "border-gray-200 focus:ring-2 focus:ring-purple-500"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                PBL (cm)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="cth: 49"
                                value={baby.pbl_cm}
                                onChange={(e) => handleUpdateBabyField(idx, "pbl_cm", e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                LK (cm)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="cth: 33"
                                value={baby.lk_cm}
                                onChange={(e) => handleUpdateBabyField(idx, "lk_cm", e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                LD (cm)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="cth: 32"
                                value={baby.ld_cm}
                                onChange={(e) => handleUpdateBabyField(idx, "ld_cm", e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                              />
                            </div>
                          </div>

                          <p className="text-[10px] text-gray-400 italic">
                            * Catatan: Nilai skrining PJB & SHK bayi diatur secara terpisah melalui tombol Edit Skrining di kartu persalinan.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bagian 4: Audit Trail */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <label className="block text-xs font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-amber-700" />
                  Nama Staff Pengubah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama staff (wajib diisi, cth: Bidan Nina)"
                  value={editStaffPengubah}
                  onChange={(e) => setEditStaffPengubah(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                />
                <p className="text-[10px] text-amber-800 mt-1">
                  Nama Anda akan dicatat pada riwayat audit sebagai penanggung jawab pengeditan data ini.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={() => setEditingPersalinan(null)}
                disabled={isSavingPersalinan}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditPersalinan}
                disabled={isSavingPersalinan}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 shadow-sm"
              >
                {isSavingPersalinan ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
