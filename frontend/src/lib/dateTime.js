/** Format an API timestamp in the browser's local timezone. */
export function formatLocalDateTime(value, options = {}) {
  if (!value) return ''
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  })
}

/** Format date only in the browser's local timezone. */
export function formatLocalDate(value) {
  if (!value) return ''
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/**
 * Parse API / ISO datetimes reliably.
 * Naive strings (no Z / offset) are treated as UTC so they convert to local on display.
 */
export function parseApiDate(value) {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return new Date(value)

  const trimmed = value.trim()
  // Already has timezone (Z or ±HH:MM)
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  // "YYYY-MM-DDTHH:mm(:ss(.sss)?)" from backend — treat as UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return new Date(`${trimmed}Z`)
  }
  return new Date(trimmed)
}

/**
 * Convert a datetime-local input value (browser local wall clock)
 * into an ISO UTC string for the API.
 */
export function localInputToISO(localValue) {
  if (!localValue) return ''
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return localValue
  return date.toISOString()
}
