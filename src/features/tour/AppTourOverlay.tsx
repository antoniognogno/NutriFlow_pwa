'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Compass, Lightbulb, Navigation, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  markTourDismissed,
  readTourState,
  shouldAutoStartTour,
  TOUR_STEPS,
  touchTourActivity,
} from './tourStore'

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

function findVisibleTourElement(selector: string): HTMLElement | null {
  const candidates = document.querySelectorAll(selector)
  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) continue
    const rect = candidate.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      return candidate
    }
  }
  return null
}

function computeClampedRect(rect: DOMRect): HighlightRect {
  const pad = 6
  const top = Math.max(4, Math.min(rect.top - pad, window.innerHeight - 60))
  const left = Math.max(4, rect.left - pad)
  const width = Math.min(window.innerWidth - left - 4, rect.width + pad * 2)
  const maxHeight = Math.max(88, Math.round(window.innerHeight * 0.4))
  const height = Math.max(36, Math.min(rect.height + pad * 2, maxHeight, window.innerHeight - top - 4))
  return { top, left, width, height }
}

const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

export function AppTourOverlay() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<HighlightRect | null>(null)
  const lockedScrollYRef = useRef(0)

  const currentStep = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0]

  useEffect(() => {
    const previousState = readTourState()
    const now = Date.now()
    if (shouldAutoStartTour(previousState, now)) {
      setStepIndex(0)
      setIsOpen(true)
    }
    touchTourActivity(now)

    const onStartTour = () => {
      setStepIndex(0)
      setIsOpen(true)
    }
    window.addEventListener('nutriflow:start-tour', onStartTour)
    return () => window.removeEventListener('nutriflow:start-tour', onStartTour)
  }, [])

  const applyBodyScrollLock = useCallback((scrollY: number) => {
    lockedScrollYRef.current = scrollY
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.touchAction = 'none'
  }, [])

  const releaseBodyScrollLock = useCallback((restoreScroll = true) => {
    const savedY = lockedScrollYRef.current
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.touchAction = ''
    if (restoreScroll) {
      window.scrollTo({ top: savedY, behavior: 'auto' })
    }
  }, [])

  // Hard-lock scroll while tour is open
  useEffect(() => {
    if (!isOpen) return

    applyBodyScrollLock(window.scrollY)

    const blockWheelOrTouch = (event: Event) => {
      event.preventDefault()
    }
    const blockScrollKeys = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) {
        event.preventDefault()
      }
    }

    window.addEventListener('wheel', blockWheelOrTouch, { passive: false })
    window.addEventListener('touchmove', blockWheelOrTouch, { passive: false })
    window.addEventListener('keydown', blockScrollKeys)

    return () => {
      window.removeEventListener('wheel', blockWheelOrTouch)
      window.removeEventListener('touchmove', blockWheelOrTouch)
      window.removeEventListener('keydown', blockScrollKeys)
      releaseBodyScrollLock(true)
    }
  }, [isOpen, applyBodyScrollLock, releaseBodyScrollLock])

  const measureAndFocusTarget = useCallback((selector: string): boolean => {
    const element = findVisibleTourElement(selector)
    if (!element) {
      setTargetRect(null)
      return false
    }

    const style = window.getComputedStyle(element)
    const isFixedElement = style.position === 'fixed' || Boolean(element.closest('.fixed'))

    if (!isFixedElement) {
      releaseBodyScrollLock(true)
      const rawRect = element.getBoundingClientRect()
      // Position target cleanly near the top (68px, right below 56px navbar) so bottom tour card never overlaps it
      const desiredTop = Math.max(0, window.scrollY + rawRect.top - 68)
      window.scrollTo({ top: desiredTop, behavior: 'auto' })
      const settledRect = element.getBoundingClientRect()
      applyBodyScrollLock(window.scrollY)
      if (settledRect.width <= 0 || settledRect.height <= 0) {
        setTargetRect(null)
        return false
      }
      setTargetRect(computeClampedRect(settledRect))
      return true
    }

    const settledRect = element.getBoundingClientRect()
    if (settledRect.width <= 0 || settledRect.height <= 0) {
      setTargetRect(null)
      return false
    }

    setTargetRect(computeClampedRect(settledRect))
    return true
  }, [applyBodyScrollLock, releaseBodyScrollLock])

  useEffect(() => {
    if (!isOpen) return

    if (location.pathname !== currentStep.route) {
      setTargetRect(null)
      releaseBodyScrollLock(false)
      lockedScrollYRef.current = 0
      window.scrollTo({ top: 0, behavior: 'auto' })
      applyBodyScrollLock(0)
      navigate(currentStep.route)
      return
    }

    let attempts = 0
    let timerId: number | null = null

    const tryFind = () => {
      const found = measureAndFocusTarget(currentStep.selector)
      attempts += 1
      if (!found && attempts < 14) {
        timerId = window.setTimeout(tryFind, 120)
      }
    }

    // Wait 310ms so route page-enter animation completes before measuring exact bounding box
    timerId = window.setTimeout(tryFind, 310)

    const handleResize = () => {
      const element = findVisibleTourElement(currentStep.selector)
      if (element) {
        setTargetRect(computeClampedRect(element.getBoundingClientRect()))
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      if (timerId !== null) window.clearTimeout(timerId)
      window.removeEventListener('resize', handleResize)
    }
  }, [
    isOpen,
    currentStep,
    location.pathname,
    navigate,
    measureAndFocusTarget,
    applyBodyScrollLock,
    releaseBodyScrollLock,
  ])

  const closeAndRemember = () => {
    markTourDismissed()
    setIsOpen(false)
    setTargetRect(null)
  }

  const handleNext = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      closeAndRemember()
      return
    }
    setStepIndex(idx => idx + 1)
  }

  const handlePrev = () => {
    setStepIndex(idx => Math.max(0, idx - 1))
  }

  if (!isOpen) return null

  const progressPercent = Math.round(((stepIndex + 1) / TOUR_STEPS.length) * 100)
  // Place tooltip on whichever vertical half maximizes clear space away from targetRect
  const spaceAbove = targetRect ? targetRect.top : 0
  const spaceBelow = targetRect ? window.innerHeight - (targetRect.top + targetRect.height) : 0
  const placeAtBottom = targetRect === null ? false : spaceBelow >= spaceAbove

  return (
    <div
      className="fixed inset-0 z-[90] touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-tour-title"
    >
      <div
        className={`fixed inset-0 touch-none ${
          targetRect ? 'bg-transparent' : 'bg-slate-950/80 backdrop-blur-[2px]'
        }`}
      />

      {targetRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[91] rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(4,9,15,0.78),0_0_22px_rgba(52,211,153,0.45)] transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <div
        data-tour-card="true"
        className={`nf-pop-enter fixed inset-x-3 z-[92] mx-auto max-w-sm rounded-2xl border border-emerald-500/45 bg-card p-3 text-card-foreground shadow-[0_18px_40px_rgba(0,0,0,0.65)] ${
          targetRect === null
            ? 'top-1/2 -translate-y-1/2'
            : placeAtBottom
              ? 'bottom-[calc(0.85rem+env(safe-area-inset-bottom))]'
              : 'top-16'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Compass className="size-3.5" />
            </span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Tour · {stepIndex + 1}/{TOUR_STEPS.length}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeAndRemember}
            aria-label="Salta tutorial"
            className="h-6 shrink-0 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="mr-0.5 size-3" />
            Salta
          </Button>
        </div>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
            <Navigation className="size-2.5 shrink-0" />
            <span className="truncate">{currentStep.pathLabel}</span>
          </div>

          <h2 id="app-tour-title" className="text-sm font-bold tracking-tight text-foreground">
            {currentStep.title}
          </h2>
          <p className="text-xs leading-snug text-muted-foreground">
            {currentStep.description}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            <Lightbulb className="size-3 shrink-0" />
            <span>{currentStep.actionHint}</span>
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeAndRemember}
            className="h-8 rounded-xl px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Salta tour
          </Button>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 rounded-xl px-2.5 text-xs"
              >
                <ArrowLeft className="mr-1 size-3" />
                Indietro
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
            >
              {stepIndex >= TOUR_STEPS.length - 1 ? (
                <>
                  <Check className="mr-1 size-3" />
                  Fine
                </>
              ) : (
                <>
                  Avanti
                  <ArrowRight className="ml-1 size-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
