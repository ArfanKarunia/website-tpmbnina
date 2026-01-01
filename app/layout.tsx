import type { Metadata } from "next";
// GANTI Inter JADI Poppins
import { Poppins } from "next/font/google";
import "./globals.css";


// Setup Font Poppins (Global)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Kita ambil variasi tebalnya juga
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "TPMB Nina Rahayu",
  description: "Layanan Kebidanan Profesional & Terpercaya di Malang",
  icons: {
    icon: "/assets/logo-bidandelima.png", // Pastikan nama file sama persis (huruf besar/kecil)
    shortcut: "/assets/logo-bidandelima.png",
    apple: "/assets/logo-bidandelima.png", // Untuk icon di iPhone/iPad
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      {/* Pasang class poppins disini */}
      <body className={poppins.className}>
        {children}
      </body>
    </html>
  );
}
