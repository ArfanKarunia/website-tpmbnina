import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Partners from "./components/Partner";
import Gallery from "./components/Gallery";
import Collaborations from "./components/Collaborations";
import Footer from "./components/Footer";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Partners />
      <Gallery />
      <Collaborations />
      <Footer />
      <FloatingWhatsApp />
    </main>
  );
}
