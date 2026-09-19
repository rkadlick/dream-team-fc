/**
 * played_on is a plain SQL `date`. It is handled everywhere as a 'YYYY-MM-DD'
 * string and never passed through a timezone-aware Date, which would shift the
 * day by one for anyone west of UTC.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** '2026-02-06' -> 'Feb 6, 2026' (en-US), with no Date involved. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  const month = MONTHS[Number(m) - 1]
  if (!month) return isoDate
  return `${month} ${Number(d)}, ${y}`
}

/** '2026-02-06' -> 'Feb 6' */
export function formatDateShort(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  const month = MONTHS[Number(m) - 1]
  if (!month) return isoDate
  return `${month} ${Number(d)}`
}

/** Today in the browser's / server's local calendar, as 'YYYY-MM-DD'. */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export type ScoreLike = {
  score_us: number
  score_them: number
  went_to_overtime: boolean
  went_to_pks: boolean
  pk_us: number | null
  pk_them: number | null
}

/** '2-2 (OT, PKs 4-3)' */
export function formatScore(m: ScoreLike): string {
  const markers: string[] = []
  if (m.went_to_overtime) markers.push('OT')
  if (m.went_to_pks) {
    markers.push(
      m.pk_us !== null && m.pk_them !== null
        ? `PKs ${m.pk_us}-${m.pk_them}`
        : 'PKs'
    )
  }
  const base = `${m.score_us}-${m.score_them}`
  return markers.length ? `${base} (${markers.join(', ')})` : base
}

export function formatPlayerLabel(p: {
  name: string
  jersey_number: number | null
  position: string | null
}): string {
  const number = p.jersey_number !== null ? `#${p.jersey_number} ` : ''
  const position = p.position ? ` (${p.position})` : ''
  return `${number}${p.name}${position}`
}

export function formatAverage(total: number, games: number): string {
  if (games <= 0) return '—'
  return (total / games).toFixed(2)
}
