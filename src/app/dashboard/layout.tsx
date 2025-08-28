'use client'

import { useState } from "react";
import Link from "next/link";
import { Menu, GalleryVerticalEnd } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NavLinks } from "@/app/components/dashboard/navLink";
import { siteConfig } from "@/config/attributes";
import { UserControls } from "@/app/components/dashboard/userControls";
import { ModeToggle } from "@/components/mode-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        
        {/* Navigazione Desktop */}
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <GalleryVerticalEnd className="h-6 w-6 text-primary" />
            <span className="hidden lg:inline-block">{siteConfig.name}</span>
          </Link>
          <NavLinks />
        </nav>

        {/* Menu Mobile */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Apri menu di navigazione</span>
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="flex flex-col p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="sr-only">
              <SheetTitle>Menu Principale</SheetTitle>
              <SheetDescription>
                Navigazione principale dell'applicazione e opzioni.
              </SheetDescription>
            </div>
            
            <nav className="grid gap-6 text-base font-medium">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <GalleryVerticalEnd className="h-6 w-6 text-primary" />
                <span>{siteConfig.name}</span>
              </Link>
              <NavLinks onLinkClick={() => setIsMobileMenuOpen(false)} />
            </nav>
            <div className="mt-auto">
              <ModeToggle />
            </div>
          </SheetContent>
        </Sheet>

        {/* --- SEZIONE CONTROLLI UTENTE AGGIORNATA --- */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mostriamo il ModeToggle solo su schermi medi e superiori */}
          <div className="hidden md:block">
            <ModeToggle />
          </div>
          
          {/* Il menu utente è sempre visibile */}
          <UserControls />
        </div>
      </header>
      
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}