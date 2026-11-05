import type { Config } from "tailwindcss";

// La app del equipo usa el sistema visual del portal del paciente (src/presentation/portal/portal.css):
// fondo #f4f7f9, texto #0d1b2a, gris #4a5c6d, bordes #dce3e8, turquesa #50c9d5, Syne + Lexend,
// esquinas redondeadas (tarjetas 24px) y sombras casi imperceptibles.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/presentation/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Grises azulados del portal en lugar del slate de Tailwind.
        // Grises como variables (rgb sin alfa en globals.css): el tema "Liquido" los invierte para
        // que el texto quede claro sobre el vidrio ahumado. Los valores claros son los del portal.
        slate: {
          50: "rgb(var(--slate-50) / <alpha-value>)",
          100: "rgb(var(--slate-100) / <alpha-value>)",
          200: "rgb(var(--slate-200) / <alpha-value>)",
          300: "rgb(var(--slate-300) / <alpha-value>)",
          400: "rgb(var(--slate-400) / <alpha-value>)",
          500: "rgb(var(--slate-500) / <alpha-value>)",
          600: "rgb(var(--slate-600) / <alpha-value>)",
          700: "rgb(var(--slate-700) / <alpha-value>)",
          800: "rgb(var(--slate-800) / <alpha-value>)",
          900: "rgb(var(--slate-900) / <alpha-value>)",
          950: "rgb(var(--slate-950) / <alpha-value>)",
        },
        zs: {
          accent: "#50c9d5",
          "accent-2": "#84d9e1",
          "accent-text": "#1e737b",
          ink: "#080b04",
          soft: "#eef9fa",
          line: "#dce3e8",
        },
      },
      fontFamily: {
        sans: ["var(--zs-font-body)", "Lexend", "Segoe UI", "system-ui", "sans-serif"],
        display: ["var(--zs-font-display)", "Syne", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        md: "0.625rem",
        lg: "0.75rem",
        xl: "0.875rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(13, 27, 42, .04), 0 10px 30px rgba(13, 27, 42, .06)",
        DEFAULT: "0 1px 2px rgba(13, 27, 42, .04), 0 10px 30px rgba(13, 27, 42, .06)",
        md: "0 1px 2px rgba(13, 27, 42, .04), 0 14px 34px rgba(13, 27, 42, .08)",
        lg: "0 18px 40px rgba(13, 27, 42, .10)",
        xl: "0 24px 60px rgba(13, 27, 42, .12)",
        "2xl": "0 30px 80px rgba(13, 27, 42, .12)",
      },
    },
  },
  plugins: [],
};
export default config;
