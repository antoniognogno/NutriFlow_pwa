export function computeConsecutiveDays(logDates: string[], todayKey: string): number {
  if (logDates.length === 0) return 0
  const uniqueDates = new Set(logDates)
  const cursor = new Date(`${todayKey}T00:00:00`)

  // Se oggi non è ancora registrato, controlla se la serie è attiva fino a ieri
  if (!uniqueDates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    const key = `${year}-${month}-${day}`
    if (!uniqueDates.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
