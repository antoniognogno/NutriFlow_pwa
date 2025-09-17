// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Importa i componenti Provider che abbiamo creato/discusso
import { ThemeProvider } from "@/components/theme-provider"; 
import { TransitionProvider } from '@/app/context/TransitionContext';
import { PageLoader } from '@/app/components/PageLoader';
import { Toaster } from "@/components/ui/sonner"; // <<< Aggiungiamo il Toaster per le notifiche

const inter = Inter({ subsets: ["latin"] });

// L'oggetto metadata è corretto, lo lasciamo così
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

// L'oggetto viewport è corretto, ma possiamo migliorarlo per i colori del tema
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [ // <<< Un modo più robusto per gestire i colori del tema
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }, // o il tuo colore di sfondo scuro
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      
      {/* Non c'è più bisogno del <head> manuale, Next.js lo gestisce con metadata e viewport */}

      <body className={inter.className}>
        {/*
          La struttura corretta dei provider è "a matrioska":
          quelli più esterni avvolgono quelli più interni.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TransitionProvider>
            <PageLoader /> {/* Il loader vive qui, fuori dai children */}
            {children}
            <Toaster /> {/* Posizioniamo il Toaster qui per le notifiche globali */}
          </TransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}