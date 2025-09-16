// src/components/dashboard/navLinks.tsx
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GlassWater, Dumbbell, Settings, BookOpen, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Gym Tracker', href: '/dashboard/gym', icon: Dumbbell },
  { name: 'Gym Stats', href: '/dashboard/stats', icon: LineChart },
  { name: 'Water Tracker', href: '/dashboard/water', icon: GlassWater },
  { name: 'Ricette', href: '/dashboard/recipes', icon: BookOpen },
  { name: 'Impostazioni', href: '/dashboard/settings', icon: Settings },
];

// Definiamo le props che il componente può ricevere
interface NavLinksProps {
  onLinkClick?: () => void; // Questa è la nostra funzione "callback" opzionale
}

export function NavLinks({ onLinkClick }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          // Quando il link viene cliccato, eseguiamo la funzione ricevuta
          onClick={onLinkClick} 
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            { 
              "bg-muted text-primary dark:text-white dark:bg-primary": 
                link.href === '/dashboard'
                  ? (pathname ?? "") === '/dashboard'
                  : (pathname ?? "").startsWith(link.href)
            }
          )}
        >
          <link.icon className="h-4 w-4" />
          {link.name}
        </Link>
      ))}
    </>
  );
}


            // "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            // { 
            //   "bg-muted text-primary dark:text-white dark:bg-primary": 