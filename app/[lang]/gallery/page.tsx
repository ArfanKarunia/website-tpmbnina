import { getDictionary } from "../.././utils/get-dictionary"; // Sesuaikan path
import Navbar from "../.././components/Navbar"; // Sesuaikan path
import Footer from "../.././components/Footer"; // Sesuaikan path
import Image from "next/image";
import { Poppins } from "next/font/google";

// Font khusus halaman ini
const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap" });

// --- DATA SEMUA FOTO ---
// Masukkan SEMUA foto kegiatanmu disini. Bisa 10, 20, atau 50 foto.
const allGalleryImages = [
  "/assets/galeri-1.jpg",
  "/assets/galeri-2.jpg",
  "/assets/galeri-3.jpg",
  "/assets/galeri-4.jpg",
  "/assets/galeri-5.jpg",
  // Tambahkan foto lainnya...
  "/assets/pict1.jpg",
  "/assets/pict2.jpg",
  "/assets/pict3.jpg",
  "/assets/pict4.jpg",
  "/assets/pict5.jpg",
  "/assets/pict6.jpg",
  "/assets/pict7.jpg",
  "/assets/pict8.jpg",
  "/assets/pict9.jpg",
  "/assets/pict10.jpg",
  "/assets/pict11.jpg",

];


export default async function GalleryPage({ 
  params 
}: { 
  params: Promise<{ lang: "id" | "en" }> 
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className={`relative bg-gray-50 min-h-screen ${poppins.className}`}>
      {/* Navbar tetap ada */}
      <Navbar lang={lang} dict={dict.navbar} />

      {/* Header Halaman */}
      <section className="pt-32 pb-12 bg-white px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-[#1e293b] mb-4">
          {dict.gallery.page_title}
        </h1>
        <div className="w-24 h-1 bg-[#ec4899] mx-auto rounded-full mb-6"></div>
        <p className="text-gray-500 max-w-2xl mx-auto">
          {dict.gallery.description}
        </p>
      </section>

      {/* --- GRID FOTO LENGKAP --- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Menggunakan CSS Grid yang rapi untuk banyak foto */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {allGalleryImages.map((src, index) => (
            <div 
              key={index} 
              // Trik agar foto terlihat bervariasi (ada yg tinggi, ada yg pendek)
              // Foto kelipatan ke-5 akan span 2 baris (opsional, biar estetik)
              className={`relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 h-64 md:h-72 ${index % 5 === 0 ? 'md:row-span-2 md:h-148' : ''}`}
            >
              <Image 
                src={src} 
                alt={`Galeri Kegiatan ${index + 1}`} 
                fill 
                className="object-cover hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" // Optimasi loading gambar
              />
               {/* Overlay tipis saat hover */}
               <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer tetap ada */}
      <Footer dict={dict.footer} />
    </main>
  );
}