export function focusAndScrollToElement(element: HTMLElement | null | undefined): void {
  if (!element) return
  requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if ('focus' in element && typeof element.focus === 'function') {
      element.focus({ preventScroll: true })
    }
  })
}
