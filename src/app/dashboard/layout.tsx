'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, WifiOff } from 'lucide-react'
import { NutriFlowLogo } from '@/components/NutriFlowLogo'
import { NavLinks } from '@/app/components/dashboard/navLink'
import { UserControls } from '@/app/components/dashboard/userControls'
import { ModeToggle } from '@/components/mode-toggle'
import { useOfflineSync } from '@/features/offline/useOfflineSync'

function getBackDestination(pathname: string): { href: string; label: string } | null {
  if (/^\/dashboard\/gym\/plan(\/|$)/.test(pathname)) {
    return { href: '/dashboard/gym', label: 'Workout' }
  }
  if (/^\/dashboard\/gym\/[^/]+$/.test(pathname)) {
    return { href: '/dashboard/gym', label: 'Workout' }
  }
  if (pathname === '/dashboard/stats') {
    return { href: '/dashboard/gym', label: 'Workout' }
  }
  if (pathname === '/dashboard/water' || pathname === '/dashboard/recipes') {
    return { href: '/dashboard/nutrition', label: 'Nutrizione' }
  }
  if (pathname === '/dashboard/settings') {
    return { href: '/dashboard', label: 'Oggi' }
  }
  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isOnline, pendingCount } = useOfflineSync()
  const backTarget = getBackDestination(pathname)
  const isWorkoutSession =
    /^\/dashboard\/gym\/[^/]+$/.test(pathname) &&
    pathname !== '/dashboard/gym/history' &&
    pathname !== '/dashboard/gym/trash'

  const handleWorkoutBack = () => {
    const win = window as Window & { __nutriflowWorkoutBackHandler?: (() => void) | null }
    if (typeof win.__nutriflowWorkoutBackHandler === 'function') {
      win.__nutriflowWorkoutBackHandler()
      return
    }
    if (backTarget) router.push(backTarget.href)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {backTarget ? (
            isWorkoutSession ? (
              <button
                type="button"
                onClick={handleWorkoutBack}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-muted/60 pr-3 pl-2 text-xs font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
              >
                <ChevronLeft className="size-4 text-primary" />
                <span>{backTarget.label}</span>
              </button>
            ) : (
              <Link
                href={backTarget.href}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-muted/60 pr-3 pl-2 text-xs font-medium text-foreground transition-colors active:scale-95 hover:bg-muted"
              >
                <ChevronLeft className="size-4 text-primary" />
                <span>{backTarget.label}</span>
              </Link>
            )
          ) : (
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
              <NutriFlowLogo className="size-8" />
              <span className="text-base font-bold tracking-tight">NutriFlow</span>
            </Link>
          )}
        </div>

        <nav className="hidden md:block" aria-label="Navigazione principale">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-1.5">
          <ModeToggle />
          <UserControls />
        </div>
      </header>

      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 border-b border-amber-400 bg-amber-200 px-3 py-1.5 text-center text-xs font-semibold text-amber-950"
        >
          <WifiOff className="size-3.5 shrink-0" />
          <span>
            Modalità offline · Tutto viene salvato in locale e sincronizzato appena torna la rete
            {pendingCount > 0 ? ` (${pendingCount} in coda)` : ''}.
          </span>
        </div>
      )}

      <main
        className={
          isWorkoutSession
            ? "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4 pb-8"
            : "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:gap-6 md:px-6 md:py-6 md:pb-8"
        }
      >
        {children}
      </main>

      <nav aria-label="Navigazione rapida" className="md:hidden">
        <NavLinks bottom />
      </nav>
    </div>
  )
}
