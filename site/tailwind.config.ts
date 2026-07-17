import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        "#0b0b12",
        panel:     "#12121c",
        border:    "rgba(255,255,255,0.08)",
        muted:     "#8b8ba7",
        fg:        "#e9e9f4",
        primary:   "#a78bfa",
        accent:    "#60a5fa",
        success:   "#22c55e",
        danger:    "#ef4444",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans:    ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "grad-primary": "linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)",
        "grad-text":    "linear-gradient(135deg, #c4b5fd 0%, #7dd3fc 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(167,139,250,0.55)",
        card: "inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.35" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;