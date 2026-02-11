import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Google VI brand colors (from global CLAUDE.md)
        brand: {
          blue: "#4285F4",
          red: "#EA4335",
          yellow: "#FBBC04",
          green: "#34A853",
          purple: "#9C27B0",
          cyan: "#00BCD4",
          orange: "#FF9800",
        },
        // Levoit brand accent
        levoit: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
