// tailwind.config.ts

import type { Config } from "tailwindcss"

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}', // Questa è la riga chiave!
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ... qui ci sono le personalizzazioni di shadcn
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config