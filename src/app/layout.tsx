// src/app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// SEI SICURO AL 100% CHE QUESTA RIGA CI SIA E SIA CORRETTA?
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriFlow",
  description: "Il tuo assistente personale per il benessere",
};

export default function RootLayout({
  children,
}: { // Ho semplificato leggermente la tipizzazione per chiarezza
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>{children}
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}