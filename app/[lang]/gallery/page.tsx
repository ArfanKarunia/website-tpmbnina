import { getDictionary } from "../.././utils/get-dictionary"; 
import Navbar from "../.././components/Navbar"; 
import Footer from "../.././components/Footer"; 
import GalleryTabbed from "../.././components/GalleryTabbed"; // Import Komponen Baru
import { Poppins } from "next/font/google";

const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap" });

export default async function GalleryPage({ 
  params 
}: { 
  params: Promise<{ lang: "id" | "en" }> 
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className={`relative bg-gray-50 min-h-screen ${poppins.className}`}>
      <Navbar lang={lang} dict={dict.navbar} />

      {/* Header Halaman */}
      <section className="pt-32 pb-6 bg-white px-4 sm:px-6 lg:px-8 text-center border-b border-gray-100 shadow-sm">
        <h1 className="text-3xl md:text-5xl font-bold text-[#1e293b] mb-4">
          {dict.gallery.page_title}
        </h1>
        <div className="w-24 h-1 bg-[#ec4899] mx-auto rounded-full mb-6"></div>
        <p className="text-gray-500 max-w-2xl mx-auto">
          {dict.gallery.description}
        </p>
      </section>

      {/* Panggil Komponen Tab Disini */}
      <GalleryTabbed />

      <Footer dict={dict.footer} />
    </main>
  );
}