import Image from "next/image";

interface PartnerProps {
  dict: {
    title: string;
    label_floating: string;
    label_box: string;
    content_title: string;
    desc: string;
    quote: string;
    rektor_name: string;
    rektor_title: string;
  };
}

export default function Partners({ dict }: PartnerProps) {
  return (
    <section className={`py-20 bg-white overflow-hidden`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- JUDUL UTAMA SECTION --- */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
            {dict.title}
          </h2>
          <div className="w-24 h-1 bg-gray-200 mx-auto rounded-full"></div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          {/* KIRI: Foto Gedung */}
          <div className="w-full md:w-1/2 relative order-1">
            <div className="absolute -top-4 -left-4 w-full h-full border-2 rounded-3xl z-0 hidden md:block border-gray-100"></div>

            <div className="relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl z-10">
              <Image
                src="/assets/itsk.jpg"
                alt="Gedung ITSK"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

              {/* GROUP LABEL POJOK KIRI BAWAH */}
              <div className="absolute bottom-6 left-6 z-20 flex flex-col items-start gap-2">
                {/* 1. TEKS DILUAR BOX (Putih & Shadow biar kebaca) */}
                <p className="text-[10px] font-light text-white uppercase tracking-widest ml-1 drop-shadow-md opacity-90">
                  {dict.label_floating}
                </p>

                {/* 2. KOTAK PUTIH (Hanya isi Nama Kampus) */}
                <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg border border-gray-100">
                  <p className="text-xs font-bold text-[#1e293b]">
                    {dict.label_box}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KANAN: Konten Cerita */}
          <div className="w-full md:w-1/2 order-2">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b] mb-6 leading-snug">
              {dict.content_title}
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 font-light">
              {dict.desc}
            </p>

            {/* WRAPPER QUOTE */}
            <div className="relative pl-6 border-l-4 border-gray-300 flex flex-col">
              {/* 1. AREA SCROLLABLE UNTUK QUOTE */}
              {/* max-h-[200px] artinya tinggi maksimal 200px, kalau lebih dia scroll */}
              {/* pr-4 memberi jarak antara teks dan scrollbar */}
              <div className="max-h-[200px] overflow-y-auto pr-4 custom-scrollbar mb-6">
                <p className="text-lg text-gray-700 italic font-medium leading-relaxed">
                  "{dict.quote}"
                </p>
              </div>

              {/* 2. INFO REKTOR (Tetap diam di bawah, tidak ikut scroll) */}
              <div className="flex items-center gap-4 mt-auto">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-gray-200 shrink-0">
                  <Image
                    src="/assets/maria.jpeg"
                    alt="Pembimbing Bidan ITSK"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-gray-900">
                    {dict.rektor_name}
                  </h5>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                    {dict.rektor_title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
