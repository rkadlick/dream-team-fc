/**
 * The single source of truth for per-player stats tracked on a match.
 *
 * Adding a new stat is two steps:
 *   1. A migration:  alter table match_player_stats add column shots int not null default 0 check (shots >= 0);
 *   2. One entry here: { key: 'shots', label: 'Shots', shortLabel: 'SH' }
 *
 * The match entry form, the match detail page and the leaderboards all render
 * from this array, and aggregates are computed in TypeScript, so nothing else
 * needs to change (there are deliberately no SQL views).
 * Also add the column to `match_player_stats` in lib/database.types.ts, or
 * regenerate that file (see the command at the top of it).
 */
export type StatConfig = {
  /** Column name in match_player_stats. */
  key: string
  /** Full name, used on forms and detail pages. */
  label: string
  /** 1-3 characters, used for table column headers. */
  shortLabel: string
}

export const STATS: StatConfig[] = [
  { key: 'goals', label: 'Goals', shortLabel: 'G' },
  { key: 'assists', label: 'Assists', shortLabel: 'A' },
]

export const STAT_KEYS = STATS.map((s) => s.key)

/** A stat row as it is read from the database / written by the form. */
export type StatValues = Record<string, number>

export function emptyStats(): StatValues {
  return Object.fromEntries(STATS.map((s) => [s.key, 0]))
}

export function pickStats(row: Record<string, unknown>): StatValues {
  return Object.fromEntries(
    STATS.map((s) => [s.key, Number(row[s.key] ?? 0)])
  )
}

export function addStats(a: StatValues, b: StatValues): StatValues {
  return Object.fromEntries(
    STATS.map((s) => [s.key, (a[s.key] ?? 0) + (b[s.key] ?? 0)])
  )
}
