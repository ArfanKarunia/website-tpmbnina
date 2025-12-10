# 🏥 Sistem Informasi & Company Profile PMB Nina Rahayu

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)

> **Platform digital terintegrasi untuk Praktik Mandiri Bidan (PMB) Nina Rahayu yang menggabungkan Company Profile modern dengan Sistem Manajemen Klinik berbasis web.**

---

## 📸 Screenshots

| Halaman Utama (Hero) | Dashboard Admin |
|:---:|:---:|
| <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/140e3588-6b9a-4867-a13b-4c3069f2fe43" /> |  <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7577574c-cf88-4942-b990-07e718f1b13a" /> |
| *Tampilan Landing Page* | *Tampilan Dashboard Karyawan* |

---

## ✨ Fitur Utama

### 🌍 Sisi Publik (Company Profile)
Website responsif yang dirancang untuk membangun kepercayaan pasien dan memberikan informasi layanan.
- **Hero Section Dinamis:** Background slideshow dengan efek transisi halus.
- **Layanan Kami:** Grid interaktif menampilkan layanan unggulan (USG, KB, Imunisasi).
- **Floating WhatsApp:** Tombol konsultasi cepat yang melayang dan responsif.
- **Galeri Kegiatan:** Dokumentasi visual fasilitas dan kegiatan PMB.
- **Lokasi & Kontak:** Integrasi Google Maps Embed dan tautan sosial media.
- **Mitra Resmi:** Menampilkan kerjasama strategis dengan ITSK RS dr. Soepraoen.

### 🔐 Sisi Admin (Internal System)
Sistem backoffice yang dilindungi autentikasi untuk operasional klinik sehari-hari.
- **Secure Login:** Autentikasi aman menggunakan Supabase Auth & Middleware Protection.
- **Dashboard Analytics:**
  - Statistik pasien harian & estimasi pendapatan real-time.
  - Grafik tren kunjungan pasien.
  - Notifikasi booking baru dari aplikasi mobile.
- **Smart Scheduling (3 Sesi):**
  - Pembagian jadwal (Pagi, Siang, Malam) dengan kuota otomatis.
  - Mencegah *double booking* dan *over-capacity*.
- **ANC Reminder Tracker:** Sistem pelacak usia kehamilan pasien dengan tombol pengingat via WhatsApp otomatis.
- **Auto-Logout Security:** Fitur keamanan otomatis logout jika tidak ada aktivitas selama 15 menit.

---

## 🛠️ Teknologi yang Digunakan

* **Frontend:** [Next.js 14 (App Router)](https://nextjs.org/)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Animation:** [Framer Motion](https://www.framer.com/motion/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
* **Deploy:** Vercel (Recommended)

---

## 📂 Struktur Project
pmb-nina-rahayu/ ├── app/ │ ├── components/ # Komponen UI (Navbar, Hero, Footer, dll) │ ├── dashboard/ # Halaman Admin (Protected Route) │ ├── login/ # Halaman Login │ ├── utils/ # Konfigurasi Supabase Client │ ├── layout.tsx # Root Layout │ └── page.tsx # Landing Page Utama ├── public/ │ └── assets/ # Gambar, Logo, dan Icon ├── middleware.ts # Logika proteksi rute (Auth Guard) ├── tailwind.config.ts # Konfigurasi Tema & Warna └── ...


---

## 🤝 Kontributor

* **[Arfan Karunia]** - *Lead Developer (Fullstack)*

---

**© 2025 TPMB Nina Rahayu.** All Rights Reserved.
