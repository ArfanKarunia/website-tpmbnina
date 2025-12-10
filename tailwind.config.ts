import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        
    "./components/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      colors: {
        pmb: {
          pink: "#ec4899",
          blue: "#1e293b",
          gray: "#f3f4f6",
          black: "#f000",
        },
      },
    },
  },
  plugins: [],
};
export default config;