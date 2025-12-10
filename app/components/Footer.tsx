import Link from "next/link";
import Image from "next/image"; 
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export default function Footer() {
  return (
    <footer
      id="contact"
      // REVISI 1: Padding dikurangi (pt-10 pb-6) biar gak boros tempat
      className={`bg-[#1e293b] text-white pt-10 pb-6 ${poppins.className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Layout Grid: Lebih rapi daripada Flex biasa */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* --- KOLOM KIRI: INFO KONTAK (Ambil 5 kolom dari 12) --- */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                TPMB Nina Rahayu
              </h3>
              <p className="text-gray-400 text-xs">
                Sahabat Kesehatan Ibu dan Anak
              </p>
            </div>

            {/* LIST KONTAK (Lebih Rapat) */}
            <div className="space-y-4"> {/* Jarak antar item dikurangi */}
              
              {/* ALAMAT */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <Image
                    src="/assets/map-pin.svg" 
                    alt="Lokasi"
                    width={16}
                    height={16}
                    className="brightness-0 invert" 
                  />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mt-1">
                  Jl. Raya Lesti No.RT03, RW.11, Gedog Wetan, <br />
                  Kec. Turen, Kab. Malang, Jatim 65175
                </p>
              </div>

              {/* TELEPON */}
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <Image
                    src="/assets/phone-call.svg" 
                    alt="Telepon"
                    width={16}
                    height={16}
                    className="brightness-0 invert"
                  />
                </div>
                <p className="text-xs text-gray-300">0813-3583-0986</p>
              </div>

              {/* SOSMED (Langsung dibawah kontak biar hemat tempat) */}
              <div className="flex gap-3 pt-2">
                 <Link href="https://www.instagram.com/sobatbidan.nina?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" className="hover:scale-110 transition-transform">
                   <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#ec4899] transition-colors">
                      <Image src="/assets/logo-instagram.png" alt="IG" width={18} height={18} className="object-contain"/>
                   </div>
                 </Link>
                 <Link href="https://facebook.com" target="_blank" className="hover:scale-110 transition-transform">
                   <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#ec4899] transition-colors">
                      <Image src="/assets/logo-facebook.png" alt="FB" width={18} height={18} className="object-contain"/>
                   </div>
                 </Link>
                 <Link href="https://www.tiktok.com/@sobat.bidan.nina?is_from_webapp=1&sender_device=pc" target="_blank" className="hover:scale-110 transition-transform">
                   <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#ec4899] transition-colors">
                      <Image src="/assets/logo-tiktok.png" alt="TT" width={18} height={18} className="object-contain"/>
                   </div>
                 </Link>
              </div>
            </div>
          </div>

          {/* --- KOLOM KANAN: GOOGLE MAPS (Ambil 7 kolom dari 12) --- */}
          <div className="md:col-span-7">
             {/* REVISI 2: Tinggi Map dipangkas jadi h-[200px] biar pendek */}
            <div className="w-full h-[200px] rounded-xl overflow-hidden shadow-md border-2 border-white/10 relative group">
              <iframe
                src="https://maps.google.com/maps?q=Jl.+Raya+Lesti+No.RT03,+RW.11,+Gedog+Wetan,+Kec.+Turen,+Kabupaten+Malang,+Jawa+Timur&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale hover:grayscale-0 transition-all duration-700 w-full h-full"
              ></iframe>

              <div className="absolute top-2 right-2 bg-white text-[#1e293b] px-3 py-1 rounded shadow-md text-[10px] font-bold pointer-events-none">
                📍 Lokasi Praktik
              </div>
            </div>
          </div>
        </div>

        {/* COPYRIGHT (Padding dikurangi) */}
        <div className="border-t border-white/10 mt-8 pt-6 text-center flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-[10px] text-gray-400">
            © {new Date().getFullYear()} TPMB Nina Rahayu. All rights reserved.
          </p>
          <p className="text-[10px] text-gray-500 font-medium">
            Develop by <span className="text-[#5f5f5f] font-bold italic">Piibool_</span>
          </p>
        </div>
      </div>
    </footer>
  );
}