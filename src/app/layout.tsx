// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"; 
import "../register-sw";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NutriFlow",
  description: "Il tuo assistente personale per il benessere.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NutriFlow",
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Controlla che 'suppressHydrationWarning' sia presente
    <html lang="it" suppressHydrationWarning> 
      <body className={inter.className}>
        {/* Controlla che ThemeProvider avvolga {children} con queste esatte props */}
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