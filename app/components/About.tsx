import Image from "next/image";



interface AboutProps {
  dict: {
    title: string;
    description :string;
    lead_role: string;
  }
}
// --- PENGATURAN DATA TIM ---
// Di sini kamu bisa atur posisi wajah per orang
const teamMembers = [
  {
    name: "Luluk Ikawati, S.Tr.Keb",
    role: "Bidan Pelaksana",
    image: "/assets/team-1.jpg",
    setting: {
      position: "object-[center_0%]", 
      zoom: "scale-100", 
    }
  },
  {
    name: "Dwi Susilowati, S.Tr.Keb",
    role: "Bidan Pelaksana",
    image: "/assets/team-2.jpg",
    setting: {
      position: "object-[center_0%]", 
      zoom: "scale-100",
    }
  },
  {
    name: "Jessika Geovani, S.Tr.Keb",
    role: "Bidan Pelaksana",
    image: "/assets/team-3jb.png",
    setting: {
      position: "object-[center_10%]",
      zoom: "scale-100", 
    }
  },
  {
    name: "Vika Firnanda, S.Tr.Keb",
    role: "Bidan Pelaksana",
    image: "/assets/team-4.png",
    setting: {
      position: "object-top", 
      zoom: "scale-100",
    }
  },
];

export default function About({dict}: AboutProps) {
  return (
    <section id="about" className={`py-20 bg-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- 1. HEADER & DESKRIPSI --- */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold  text-[#1e293b] mb-6">
            {dict.title}
          </h2>
          <p className="text-gray-600 text-2g leading-relaxed">
            {dict.description}
          </p>
        </div>

        {/* --- 2. MAIN PROFILE (BIDAN NINA) --- */}
        <div className="flex flex-col items-center justify-center mb-16">
          <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6 group overflow-hidden rounded-full"> {/* Tambah overflow-hidden disini */}
            <div className="absolute inset-0 rounded-full border-4 border-pmb-pink/20 group-hover:border-pmb-pink transition-colors duration-300 z-10"></div>
            <Image
              src="/assets/nina.jpg"
              alt="Nina Rahayu, S.Tr.Keb"
              fill
              className="object-cover object-[center_85%] scale-360 transition-transform duration-500 group-hover:scale-330"
            />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900">
            Nina Rahayu, S.Tr.Keb
          </h3>
          <p className="text-pmb-pink font-medium mt-1">
            {dict.lead_role}
          </p>
        </div>

        {/* --- 3. TEAM MEMBERS (GRID) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {teamMembers.map((member, index) => (
            <div key={index} className="flex flex-col items-center text-center group">
              
              {/* Foto Tim */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 mb-4 overflow-hidden rounded-full shadow-md group-hover:shadow-xl transition-all duration-300">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  // LOGIC ADJUSTMENT:
                  // 1. member.setting.position -> Mengatur posisi wajah
                  // 2. member.setting.zoom -> Mengatur zoom permanen
                  // 3. group-hover:scale-xxx -> Efek zoom saat mouse diarahkan
                  className={`object-cover transition-transform duration-500 
                    ${member.setting.position} 
                    ${member.setting.zoom} 
                    group-hover:scale-110
                  `}
                />
              </div>
              
              {/* Nama & Jabatan */}
              <h4 className="text-lg font-bold text-gray-800 group-hover:text-pmb-pink transition-colors">
                {member.name.split(',')[0]}
              </h4>
              <span className="text-sm font-bold text-gray-500">
                {member.name.split(',')[1]} 
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}