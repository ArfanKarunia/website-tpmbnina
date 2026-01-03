import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Partners from "../components/Partner";
import Gallery from "../components/Gallery";
import Research from "../components/Research";
import Collaborations from "../components/Collaborations";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import Navbar from "../components/Navbar";
import { getDictionary } from ".././utils/get-dictionary";



export default async function Home({ 
  params 
}: { 
  params: Promise<{ lang: "id" | "en" }> 
}) {
  // 1. AWAIT PARAMS DULU (Wajib di Next.js 15)
  const { lang } = await params; 
  const dict = await getDictionary(lang);
  return (
    <main className="relative">
      <Navbar lang={lang} dict={dict.navbar} />
      <Hero dict={dict.hero} />
      <About dict={dict.about}/>
      <Services dict={dict.services} />
      <Partners dict={dict.partner}/>
      <Gallery lang={lang} dict={dict.gallery}/>
      <Research dict={dict.research}/>
      <Collaborations dict={dict.collaborations} />
      <Footer dict={dict.footer}/>
      <FloatingWhatsApp dict={dict.floatingwhatsapp}/>
    </main> 
  );
}
