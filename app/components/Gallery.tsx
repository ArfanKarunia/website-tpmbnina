import Image from "next/image";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Data Foto Galeri (Pastikan file ada di assets)
const galleryImages = [
  "/assets/galeri-1.jpg", // Foto Utama (Besar)
  "/assets/galeri-2.jpg",
  "/assets/galeri-5.jpg",
  "/assets/galeri-4.jpg",
  "/assets/galeri-3.jpg",
];

export default function Gallery() {
  return (
    <section id="gallery" className={`py-20 bg-gray-50 ${poppins.className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold  text-[#1e293b] mb-4">Galeri Kegiatan</h2>
          <p className="text-gray-500">Momen kebahagiaan dan pelayanan di TPMB Nina Rahayu</p>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] md:h-[600px]">
          
          {/* Foto 1 (Utama - Besar di Kiri) */}
          <div className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden group">
            <Image
              src="/assets/galeri-1.jpg" // Ganti dengan foto paling bagus
              alt="Galeri Utama"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
          </div>

          {/* Foto 2-5 (Kecil-kecil di Kanan) */}
          {galleryImages.slice(1).map((src, index) => (
            <div key={index} className="relative rounded-2xl overflow-hidden group">
              <Image
                src={src} // Pastikan filenya ada, atau pakai placeholder dulu
                alt={`Galeri ${index + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Efek Hover Gelap jadi Terang */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}