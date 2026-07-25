import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Setup Font Poppins (Global)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  // 1. Meta Dasar
  title: "TPMB Nina Rahayu | Klinik Bidan & USG Kehamilan di Malang",
  description: "Klinik TPMB Nina Rahayu menyediakan layanan kebidanan profesional, pemeriksaan kehamilan, persalinan, serta USG 2D/3D/4D terpercaya di wilayah Malang.",
  keywords: ["Bidan Malang", "Klinik Kandungan Malang", "USG Kehamilan Malang", "USG 4D Malang", "TPMB Nina Rahayu", "Bidan Terpercaya"],
  
  // 2. Favicon & Apple Icon
  icons: {
    icon: "/assets/logo-bidandelima.png",
    shortcut: "/assets/logo-bidandelima.png",
    apple: "/assets/logo-bidandelima.png",
  },
  
  // 3. Canonical Tag (Menghindari Duplicate Content)
  alternates: {
    canonical: "https://www.tpmbnina.com/id",
    languages: {
      'id': 'https://www.tpmbnina.com/id',
      'en': 'https://www.tpmbnina.com/en', 
    },
  },
  
  // 4. Open Graph (Untuk Preview link saat di-share di WhatsApp / Sosmed)
  openGraph: {
    title: "TPMB Nina Rahayu | Klinik Bidan & USG Kehamilan",
    description: "Layanan kebidanan profesional dan USG 2D/3D/4D terpercaya di Malang.",
    url: "https://www.tpmbnina.com",
    siteName: "TPMB Nina Rahayu",
    images: [
      {
        url: "/assets/logo-bidandelima.png", // Idealnya ganti dengan banner foto klinik ukuran 1200x630px jika ada
        width: 800,
        height: 600,
        alt: "Logo Klinik TPMB Nina Rahayu",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className={poppins.className}>
        {children}
      </body>
    </html>
  );
}