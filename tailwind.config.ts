import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        inv: "var(--inv)",
        card: "var(--card)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        ring: "var(--ring)",
        navbg: "var(--navBg)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink2)",
          3: "var(--ink3)",
          4: "var(--ink4)",
          5: "var(--ink5)",
          6: "var(--ink6)",
        },
        purp: {
          DEFAULT: "var(--purp)",
          hov: "var(--purpHov)",
          ink: "var(--purpInk)",
          alt: "var(--purpAlt)",
        },
        grn: { DEFAULT: "var(--grn)", 2: "var(--grn2)" },
        berry: { DEFAULT: "var(--berryInk)", 2: "var(--berryInk2)", 3: "var(--berryInk3)" },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "-apple-system", "Helvetica Neue", "Helvetica", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        jp: ["var(--font-noto-serif-jp)", "serif"],
      },
      borderRadius: {
        sheet: "34px 34px 50px 50px",
      },
      keyframes: {
        kagePulse: {
          "0%, 100%": { opacity: ".35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.35)" },
        },
        kageDrift: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-14px,0)" },
        },
      },
      animation: {
        "kage-pulse": "kagePulse 2.2s ease-in-out infinite",
        "kage-drift": "kageDrift 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
