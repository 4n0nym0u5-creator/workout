export function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parseDate(value)
  return localDate(date) === value
}

/** Monday = 1 … Sunday = 7 */
export function weekdayMon1(date: Date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function startOfWeek(date: Date) {
  const start = startOfDay(date)
  return addDays(start, 1 - weekdayMon1(start))
}

export function daysBetween(earlier: string, later: string) {
  const start = parseDate(earlier).getTime()
  const end = parseDate(later).getTime()
  return Math.round((end - start) / 86_400_000)
}

export function formatDay(iso: string) {
  return parseDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatWeekday(iso: string) {
  return parseDate(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatTempo(ms: number) {
  const seconds = ms / 1000
  const text = Number.isInteger(seconds) ? seconds.toFixed(1) : seconds.toFixed(2).replace(/0$/, '')
  return `${text}s`
}

export function weekKey(date: Date) {
  return localDate(startOfWeek(date))
}

/** Noon on a past day; "now" when the ISO date is today. */
export function completedAtFor(date: string, now = new Date()) {
  if (date === localDate(now)) return new Date(now.getTime())
  const day = parseDate(date)
  day.setHours(12, 0, 0, 0)
  return day
}

export function clampIsoDate(value: string, min: string, max: string) {
  if (!isIsoDate(value)) return max
  if (value < min) return min
  if (value > max) return max
  return value
}

export function formatRelativeDay(iso: string, now = new Date()) {
  const today = localDate(now)
  if (iso === today) return 'Today'
  if (iso === localDate(addDays(now, -1))) return 'Yesterday'
  return formatDay(iso)
}
