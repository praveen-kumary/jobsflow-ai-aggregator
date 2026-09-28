import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Public site palette (Section 12)
        ink: { 950: "#0F1729" },
        paper: { 50: "#FAFAF7" },
        slateText: { 600: "#4B5768" },
        signal: { 500: "#E8873A" },
        verified: { 600: "#1F7A5C" },
        line: { 200: "#E4E1D9" },
        // Admin dashboard palette (Section 12)
        adminBg: { 950: "#101114" },
        adminSurface: { 900: "#1A1B1F" },
        adminText: { 100: "#EDEDEF" },
        adminMuted: { 500: "#86888F" },
        adminStatus: {
          pending: "#C9A227",
          published: "#3FA66B",
          needsReview: "#D6553D",
          expired: "#5B5D66",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px
      },
    },
  },
  plugins: [],
};
export default config;
