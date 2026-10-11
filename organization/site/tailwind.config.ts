import type { Config } from "tailwindcss";

/** Brand colours from the logo: deep blue into green, with a warm amber accent. */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1240px" } },
    extend: {
      colors: {
        brand: {
          50: "#eef4ff", 100: "#dce8ff", 200: "#b9d0ff", 300: "#8bb0fb", 400: "#5a87f2",
          500: "#3563e3", 600: "#2449c4", 700: "#1e3a9e", 800: "#1c337f", 900: "#142456", 950: "#0b1533",
        },
        leaf: { 50: "#ecfdf3", 100: "#d1fae0", 400: "#34d27b", 500: "#16b364", 600: "#0e9350", 700: "#0d7442" },
        accent: { 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },
        ink: { 50: "#f7f8fb", 100: "#eef0f5", 200: "#dfe3ec", 400: "#8a93a8", 500: "#5f6880", 700: "#323a4f", 900: "#111827" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-deva)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-deva)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -8px rgba(16,24,40,.08)",
        lift: "0 2px 4px rgba(16,24,40,.04), 0 20px 40px -12px rgba(30,58,158,.22)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1e3a9e 0%, #2449c4 45%, #0e9350 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
