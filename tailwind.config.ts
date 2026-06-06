import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // TDGame Design Tokens
        bg:        "#080808",
        surface:   "#111111",
        "surface-2": "#181818",
        primary:   "#FF9500",
        "primary-dim": "rgba(255,149,0,0.12)",
        "neutral-light":  "#F0F0F0",
        "neutral-medium": "#888",
        "neutral-dark":   "#333",
        "status-success": "#22C55E",
        "status-error":   "#EF4444",
        "status-warning": "#F59E0B",
        "status-info":    "#3B82F6",
      },
      fontFamily: {
        jakarta:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono:       ["'JetBrains Mono'", "monospace"],
        // legacy alias kept so old class names don't break
        montserrat: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":     "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
        "glow-sm":  "0 0 12px rgba(255,149,0,0.25)",
        "glow":     "0 0 24px rgba(255,149,0,0.3)",
        "inset-t":  "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.35s ease both",
        "scale-in": "scale-in 0.25s ease both",
        "shimmer":  "shimmer 2s linear infinite",
      },
      borderRadius: {
        "xl":  "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};
export default config;
