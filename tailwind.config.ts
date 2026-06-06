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
        // TDGame Design System tokens (matches tdgames-platforms STYLE_GUIDE)
        bg: "#0F0F0F",
        surface: "#1A1A1A",
        primary: "#FF9500",
        "neutral-light": "#F2F2F2",
        "neutral-medium": "#9D9C9D",
        "neutral-dark": "#404040",
        "status-success": "#4CAF50",
        "status-error": "#F44336",
        "status-warning": "#FFA726",
        "status-info": "#2196F3",
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
