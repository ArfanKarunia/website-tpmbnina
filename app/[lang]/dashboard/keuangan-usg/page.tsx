"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { 
  DollarSign, PieChart, Activity, Stethoscope, Wallet, Users, 
  Banknote, Calendar, ArrowLeft, BarChart3
} from "lucide-react";
import Link from "next/link";

export default function KeuanganUSGPage() {
  const supabase = createClient();
  
  // State untuk filter bulan (Default: Bulan Ini)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);

  // State Data Keuangan
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [totalPasien, setTotalPasien] = useState(0);
  const [rekapMingguan, setRekapMingguan] = useState({ m1: 0, m2: 0, m3: 0, m4: 0 });

  // --- LOGIKA FETCH DATA DARI SUPABASE ---
  useEffect(() => {
    const fetchKeuangan = async () => {
      setLoading(true);
      
      const year = parseInt(selectedMonth.split("-")[0]);
      const month = parseInt(selectedMonth.split("-")[1]);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      // Ambil data bulan terpilih HANYA yang statusnya 'selesai'
      const { data, error } = await supabase
        .from("usg_reservations")
        .select("harga, tanggal_reservasi")
        .gte("tanggal_reservasi", startDate)
        .lte("tanggal_reservasi", endDate)
        .eq("status", "selesai");

      if (!error && data) {
        let total = 0;
        let m1 = 0, m2 = 0, m3 = 0, m4 = 0;

        data.forEach(p => {
          total += p.harga;
          const day = parseInt(p.tanggal_reservasi.split("-")[2]); // Ambil tanggal

          // Pisahkan ke minggu 1 - 4
          if (day <= 7) m1 += p.harga;
          else if (day <= 14) m2 += p.harga;
          else if (day <= 21) m3 += p.harga;
          else m4 += p.harga;
        });

        setTotalPendapatan(total);
        setTotalPasien(data.length);
        setRekapMingguan({ m1, m2, m3, m4 });
      }
      
      setLoading(false);
    };

    fetchKeuangan();
  }, [selectedMonth, supabase]);

  // --- LOGIKA PEMBAGIAN KEUANGAN (SPLITTING) BERDASARKAN EXCEL ---
  const splits = {
    dokter: totalPendapatan * 0.175,      // Gaji Dokter: 17.5%
    operasional: totalPendapatan * 0.20,  // Operasional USG: 20%
    cicilan: totalPendapatan * 0.40,      // Cicilan USG: 40%
    karyawan: totalPendapatan * 0.05,     // Karyawan: 5%
    profit: totalPendapatan * 0.175,      // Profit Bidan Nina: 17.5%
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER & FILTER BULAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20}/></Link>
             <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-pink-500" /> Manajemen Keuangan USG
             </h1>
          </div>
          <p className="text-gray-500 text-sm ml-7">Sistem perhitungan bagi hasil dan laba kotor khusus Owner.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <Calendar size={18} /> Pilih Bulan:
          </label>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 font-bold text-pink-600 bg-pink-50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-pink-500">
          <Activity className="animate-pulse w-10 h-10" />
        </div>
      ) : (
        <>
          {/* CARD TOTAL PENDAPATAN HERO */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-20">
              <PieChart size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-pink-100 font-medium mb-2 flex items-center gap-2">
                  <DollarSign size={18} /> Total Pemasukan USG Kotor
                </p>
                <h2 className="text-4xl md:text-5xl font-black mb-2">{formatRupiah(totalPendapatan)}</h2>
                <p className="text-sm bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                  Dari total <b>{totalPasien}</b> pasien selesai bulan ini
                </p>
              </div>
            </div>
          </div>

          {/* GRID PEMBAGIAN DANA (SPLIT) - RAHASIA OWNER */}
          <h3 className="text-xl font-bold text-gray-800 mt-10 mb-4 flex items-center gap-2">
            <Activity size={24} className="text-blue-500" /> Distribusi Bagi Hasil
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Cicilan Mesin (40%) */}
            <div className="bg-white p-6 rounded-2xl border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Activity size={24} /></div>
                <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">40%</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Cicilan Mesin USG</p>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{formatRupiah(splits.cicilan)}</h4>
            </div>

            {/* 2. Operasional (20%) */}
            <div className="bg-white p-6 rounded-2xl border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Wallet size={24} /></div>
                <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">20%</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Operasional USG</p>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{formatRupiah(splits.operasional)}</h4>
            </div>

            {/* 3. Profit PMB Nina (17.5%) */}
            <div className="bg-white p-6 rounded-2xl border-t-4 border-t-green-500 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute right-0 bottom-0 p-4 opacity-5"><Banknote size={80}/></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Banknote size={24} /></div>
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">17.5%</span>
              </div>
              <p className="text-gray-500 text-sm font-medium relative z-10">Laba Bersih / Profit Bidan</p>
              <h4 className="text-2xl font-black text-green-600 mt-1 relative z-10">{formatRupiah(splits.profit)}</h4>
            </div>

            {/* 4. Gaji Dokter (17.5%) */}
            <div className="bg-white p-6 rounded-2xl border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Stethoscope size={24} /></div>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">17.5%</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Gaji Dokter (SpOG)</p>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{formatRupiah(splits.dokter)}</h4>
            </div>

            {/* 5. Gaji Karyawan (5%) */}
            <div className="bg-white p-6 rounded-2xl border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Users size={24} /></div>
                <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">5%</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Fee Karyawan</p>
              <h4 className="text-2xl font-black text-gray-900 mt-1">{formatRupiah(splits.karyawan)}</h4>
            </div>
          </div>

          {/* REKAP MINGGU 1 - 4 (SAMA SEPERTI DI DATA USG) */}
          <div className="mt-10">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-gray-400" /> Detail Pemasukan per Minggu
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-500 mb-2">Minggu 1</p>
                  <h4 className="text-lg font-black text-gray-800">{formatRupiah(rekapMingguan.m1)}</h4>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-500 mb-2">Minggu 2</p>
                  <h4 className="text-lg font-black text-gray-800">{formatRupiah(rekapMingguan.m2)}</h4>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-500 mb-2">Minggu 3</p>
                  <h4 className="text-lg font-black text-gray-800">{formatRupiah(rekapMingguan.m3)}</h4>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-500 mb-2">Minggu 4</p>
                  <h4 className="text-lg font-black text-gray-800">{formatRupiah(rekapMingguan.m4)}</h4>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}