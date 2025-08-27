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
import { NavLinks } from "@/app/components/dashboard/navLink"; // Il nostro componente con i link
import { siteConfig } from "@/config/attributes";
import { UserControls } from "@/app/components/dashboard/userControls";
import { ModeToggle } from "@/components/mode-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        
        {/* --- Navigazione Desktop --- */}
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <GalleryVerticalEnd className="h-6 w-6 text-primary" />
            <span className="hidden lg:inline-block">{siteConfig.name}</span> {/* Mostra il nome su schermi grandi */}
          </Link>
          {/* 1. ECCO LA MODIFICA CHIAVE: INSERIAMO I NOSTRI LINK QUI */}
          <NavLinks />
        </nav>

        {/* --- Menu Mobile --- */}
        <Sheet>
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
              <SheetDescription>Navigazione principale dell'applicazione</SheetDescription>
            </div>
            <nav className="grid gap-6 text-base font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <GalleryVerticalEnd className="h-6 w-6 text-primary" />
                <span>{siteConfig.name}</span>
              </Link>
              <NavLinks />
            </nav>
            <div className="mt-auto">
              <ModeToggle />
            </div>
          </SheetContent>
        </Sheet>

        {/* --- Controlli Utente (Sempre a destra) --- */}
        <div className="ml-auto flex items-center gap-4">
          {/* 2. Abbiamo rimosso i pulsanti vecchi, lasciando solo questo componente */}
          <UserControls />
        </div>
      </header>
      
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}