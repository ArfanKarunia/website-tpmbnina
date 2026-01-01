import Image from "next/image";


interface CollaborationsProps {
  dict: {
    title: string;
  }
}
// Data Logo Partner
const partners = [
  "/assets/logo-ibi.png",  
  "/assets/logo-itsk.png",
  "/assets/logo-rs1.png",
  "/assets/logo-rsbenmari.png", 
  "/assets/logo-bpjs.png",
  "/assets/logo-puskesmas.png",
  "/assets/logo-rspindad.png",
  "/assets/logo-wava.png",
  "/assets/logo.png",
];

export default function Collaborations({dict}: CollaborationsProps) {
  return (
    <section className="py-10 bg-white border-t border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <h3 className="text-xl font-bold text-gray-400 tracking-widest uppercase">
          {dict.title}
        </h3>
      </div>

      {/* Container Utama: Overflow Hidden biar logo yg lewat batas gak kelihatan */}
      <div className="relative w-full overflow-hidden group">
        
        {/* WRAPPER ANIMASI:
            Class 'animate-scroll' sudah kita bikin di globals.css.
            Isinya cukup 2 Set Logo (Set A & Set B).
            Saat Set A habis digeser ke kiri, Set B akan menggantikan posisinya,
            lalu animasi reset ke 0 tanpa kedip.
        */}
        <div className="flex animate-scroll gap-16 md:gap-24 px-8">
          
          {/* --- Set 1 (Asli) --- */}
          {partners.map((src, idx) => (
            <div key={`a-${idx}`} className="relative w-20 h-20 shrink-0 transition-all duration-300 hover:scale-110 grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
              <Image src={src} alt="Partner" fill className="object-contain" />
            </div>
          ))}

          {/* --- Set 2 (Duplikat untuk Looping) --- */}
          {partners.map((src, idx) => (
            <div key={`b-${idx}`} className="relative w-20 h-20 shrink-0 transition-all duration-300 hover:scale-110 grayscale hover:grayscale-0 opacity-70 hover:opacity-100">
              <Image src={src} alt="Partner" fill className="object-contain" />
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}