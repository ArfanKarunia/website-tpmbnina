"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";

interface Props {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  delay?: number; // Biar bisa diatur jedanya (staggered)
}

export const Reveal = ({ children, width = "fit-content", delay = 0.25 }: Props) => {
  const ref = useRef(null);
  // useInView: Mendeteksi apakah elemen sudah masuk layar?
  // once: true artinya animasinya cuma sekali aja (biar gak ngulang2 pas scroll naik turun)
  const isInView = useInView(ref, { once: true }); 

  const mainControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      // Kalau masuk layar, jalankan animasi "visible"
      mainControls.start("visible");
    }
  }, [isInView, mainControls]);

  return (
    <div ref={ref} style={{ position: "relative", width, overflow: "hidden" }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 }, // Awal: Transparan & agak di bawah
          visible: { opacity: 1, y: 0 }, // Akhir: Muncul & posisi normal
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: 0.5, delay: delay }} // Durasi 0.5 detik
      >
        {children}
      </motion.div>
    </div>
  );
};