/**
 * The single source of truth for the stats tracked on a match.
 *
 * Adding a new per-player stat is three steps:
 *   1. A migration: `alter table match_player_stats add column x int check (x >= 0);`
 *      (nullable, no default — see "Optional stats" below)
 *   2. The SAME migration must also `create or replace public.save_match`, which
 *      lists every stat column explicitly. Skipping this makes the form appear
 *      to save the stat while the RPC silently drops it. The function's
 *      unknown-key guard turns that mistake into a loud error instead.
 *   3. One entry in STATS below, plus the column in `match_player_stats` in
 *      lib/database.types.ts (or regenerate that file).
 *
 * The match entry form, the match detail page and the leaderboards all render
 * from these arrays, and aggregates are computed in TypeScript, so nothing else
 * needs to change (there are deliberately no SQL views).
 *
 * Optional stats
 * --------------
 * `optional: true` means the column is nullable: `null` is "not tracked for
 * this match", `0` is "tracked, and it was zero". Totals skip nulls, and each
 * stat carries its own per-game denominator (the number of matches in which it
 * was actually recorded) so an untracked match never dilutes an average.
 * goals and assists are `not null default 0` and are always recorded.
 */
export type StatConfig = {
  /** Column name in match_player_stats. */
  key: string
  /** Full name, used on forms and detail pages. */
  label: string
  /** 1-3 characters, used for table column headers. */
  shortLabel: string
  /** Nullable column; null means "not tracked". */
  optional?: boolean
  /** Counts toward the combined contribution column (G+A). */
  combined?: boolean
  /** Gets its own column in the roster leaderboard table. */
  inTable?: boolean
  /** Gets a per-game average column in the roster leaderboard table. */
  perGame?: boolean
  /** Gets a "Top ..." panel on the dashboard. */
  leaderboard?: boolean
  /** Only meaningful for goalkeepers. Display-only: the column is always stored. */
  gkOnly?: boolean
}

export const STATS: StatConfig[] = [
  {
    key: 'goals',
    label: 'Goals',
    shortLabel: 'G',
    combined: true,
    inTable: true,
    perGame: true,
    leaderboard: true,
  },
  {
    key: 'assists',
    label: 'Assists',
    shortLabel: 'A',
    combined: true,
    inTable: true,
    perGame: true,
    leaderboard: true,
  },
  {
    key: 'shots',
    label: 'Shots',
    shortLabel: 'SH',
    optional: true,
    inTable: true,
    leaderboard: true,
  },
  {
    key: 'shots_on_target',
    label: 'Shots on target',
    shortLabel: 'SOT',
    optional: true,
  },
  {
    key: 'tackles',
    label: 'Tackles',
    shortLabel: 'TKL',
    optional: true,
    inTable: true,
    leaderboard: true,
  },
  {
    key: 'saves',
    label: 'Saves',
    shortLabel: 'SV',
    optional: true,
    gkOnly: true,
    leaderboard: true,
  },
  { key: 'yellow_cards', label: 'Yellow cards', shortLabel: 'YC', optional: true },
  { key: 'red_cards', label: 'Red cards', shortLabel: 'RC', optional: true },
]

export const STAT_KEYS = STATS.map((s) => s.key)

/** Only these are summed into the "G+A" column; adding cards to it is nonsense. */
export const CONTRIBUTION_STATS = STATS.filter((s) => s.combined)
export const CONTRIBUTION_KEYS = CONTRIBUTION_STATS.map((s) => s.key)
export const CONTRIBUTION_LABEL = CONTRIBUTION_STATS.map((s) => s.shortLabel).join('+')

export const TABLE_STATS = STATS.filter((s) => s.inTable)
export const PER_GAME_STATS = STATS.filter((s) => s.perGame)
export const LEADERBOARD_STATS = STATS.filter((s) => s.leaderboard)

/** Player of the match: 1-3 players per match. The rank is a slot, not a placing. */
export const MAX_POTG = 3

/**
 * A stat row as it is read from the database / written by the form.
 * null is "not tracked" and is only possible for `optional` stats.
 */
export type StatValues = Record<string, number | null>

export function emptyStats(): StatValues {
  return Object.fromEntries(STATS.map((s) => [s.key, s.optional ? null : 0]))
}

export function pickStats(row: Record<string, unknown>): StatValues {
  return Object.fromEntries(
    STATS.map((s) => {
      const raw = row[s.key]
      if (raw === null || raw === undefined || raw === '') {
        return [s.key, s.optional ? null : 0]
      }
      const n = Number(raw)
      return [s.key, Number.isFinite(n) ? n : s.optional ? null : 0]
    })
  )
}

/**
 * Whether a stat should be shown at all for this player. Saves are stored for
 * everyone but only make sense for a keeper — unless a value is already there,
 * in which case hiding it would hide real data.
 */
export function statApplies(
  stat: StatConfig,
  position: string | null,
  value?: number | null
): boolean {
  if (!stat.gkOnly) return true
  if (position === 'GK') return true
  return value !== null && value !== undefined
}

// ---------------------------------------------------------------------------
// Per-match team stats
// ---------------------------------------------------------------------------

/**
 * Recorded for both sides, as `<key>_us` and `<key>_them` columns on `matches`.
 * All are nullable: they are optional, and blank means "not tracked".
 */
export type MatchStatConfig = {
  key: string
  label: string
  /** Rendered with a % suffix and bounded to 0-100. */
  percent?: boolean
}

export const MATCH_STATS: MatchStatConfig[] = [
  { key: 'shots', label: 'Shots' },
  { key: 'shots_on_target', label: 'Shots on target' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'possession', label: 'Possession', percent: true },
  { key: 'pass_accuracy', label: 'Pass accuracy', percent: true },
]

export const MATCH_STAT_KEYS = MATCH_STATS.flatMap((s) => [
  `${s.key}_us`,
  `${s.key}_them`,
])

export type MatchStatValues = Record<string, number | null>

export function emptyMatchStats(): MatchStatValues {
  return Object.fromEntries(MATCH_STAT_KEYS.map((k) => [k, null]))
}

export function pickMatchStats(row: Record<string, unknown>): MatchStatValues {
  return Object.fromEntries(
    MATCH_STAT_KEYS.map((k) => {
      const raw = row[k]
      if (raw === null || raw === undefined || raw === '') return [k, null]
      const n = Number(raw)
      return [k, Number.isFinite(n) ? n : null]
    })
  )
}
