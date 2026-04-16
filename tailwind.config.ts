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
        quintia: {
          bg: "#0a0e17",
          surface: "#111827",
          border: "#1f2937",
          primary: "#3b82f6",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          text: "#f9fafb",
          "text-secondary": "#9ca3af",
        }
      }
    },
  },
  plugins: [],
};
export default config;
