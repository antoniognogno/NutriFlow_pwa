'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Dumbbell, Home, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { name: 'Oggi', href: '/dashboard', icon: Home },
  { name: 'Workout', href: '/dashboard/gym', icon: Dumbbell },
  { name: 'Routine', href: '/dashboard/routine', icon: CheckSquare },
  { name: 'Nutrizione', href: '/dashboard/nutrition', icon: Utensils },
] as const;

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/gym') {
    return pathname.startsWith('/dashboard/gym') || pathname.startsWith('/dashboard/stats');
  }
  if (href === '/dashboard/routine') {
    return pathname.startsWith('/dashboard/routine');
  }
  if (href === '/dashboard/nutrition') {
    return (
      pathname.startsWith('/dashboard/nutrition') ||
      pathname.startsWith('/dashboard/water') ||
      pathname.startsWith('/dashboard/recipes')
    );
  }
  return pathname.startsWith(href);
}

interface NavLinksProps {
  onLinkClick?: () => void;
  bottom?: boolean;
}

export function NavLinks({ onLinkClick, bottom = false }: NavLinksProps) {
  const pathname = usePathname();
  const isWorkoutSession =
    /^\/dashboard\/gym\/[^/]+$/.test(pathname) &&
    pathname !== '/dashboard/gym/history' &&
    pathname !== '/dashboard/gym/trash';

  if (bottom && isWorkoutSession) {
    return null;
  }

  return (
    <div
      className={cn(
        bottom
          ? "fixed inset-x-3 bottom-[calc(0.65rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-1 rounded-[22px] border border-white/10 bg-card/85 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:hidden"
          : "flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 backdrop-blur-md",
      )}
    >
      {NAV_ITEMS.map((link) => {
        const isActive = isNavItemActive(link.href, pathname);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              bottom
                ? "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10.5px] font-medium tracking-tight transition-all duration-150 active:scale-95"
                : "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150",
              isActive
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <link.icon
              strokeWidth={isActive ? 2.25 : 1.75}
              className={cn(
                "transition-transform duration-150",
                bottom ? "size-[19px]" : "size-3.5",
                isActive && bottom && "scale-105",
              )}
            />
            <span className="truncate leading-tight">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
