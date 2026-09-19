import { STATS, type StatValues, emptyStats, pickStats } from '@/lib/stats-config'

export type PlayerRow = {
  id: string
  name: string
  jersey_number: number | null
  position: string | null
  is_human: boolean
  gamertag: string | null
  is_active: boolean
}

export type MatchRow = {
  id: string
  season_id: string
  game_type_id: string
  played_on: string
  division: number
  opponent: string
  home_away: string
  score_us: number
  score_them: number
  opp_own_goals: number
  went_to_overtime: boolean
  went_to_pks: boolean
  pk_us: number | null
  pk_them: number | null
  result: string
  notes: string | null
}

export type StatRow = {
  match_id: string
  player_id: string
} & Record<string, unknown>

export type PlayerTotals = {
  player: PlayerRow
  stats: StatValues
  /** Human players only; null for AI, which is rendered as "-". */
  gamesPlayed: number | null
}

/**
 * Aggregate stat rows per player. Deliberately done in TypeScript rather than
 * a SQL view so that adding a stat is one migration + one config entry.
 */
export function totalsByPlayer(
  players: PlayerRow[],
  statRows: StatRow[]
): PlayerTotals[] {
  const byId = new Map<string, PlayerTotals>()
  for (const player of players) {
    byId.set(player.id, {
      player,
      stats: emptyStats(),
      gamesPlayed: player.is_human ? 0 : null,
    })
  }

  for (const row of statRows) {
    const entry = byId.get(row.player_id)
    if (!entry) continue
    const values = pickStats(row)
    for (const stat of STATS) {
      entry.stats[stat.key] += values[stat.key] ?? 0
    }
    // A stat row exists for every human who played, even at zero, so counting
    // rows is the games-played count. AI players only appear when they scored
    // or assisted, so the count would be meaningless for them.
    if (entry.gamesPlayed !== null) entry.gamesPlayed += 1
  }

  return [...byId.values()]
}

export function sumStat(stats: StatValues, keys: string[]): number {
  return keys.reduce((total, key) => total + (stats[key] ?? 0), 0)
}

export type Record_ = {
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  played: number
}

export function teamRecord(matches: MatchRow[]): Record_ {
  const record: Record_ = {
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    played: matches.length,
  }
  for (const m of matches) {
    if (m.result === 'W') record.wins += 1
    else if (m.result === 'D') record.draws += 1
    else if (m.result === 'L') record.losses += 1
    record.goalsFor += m.score_us
    record.goalsAgainst += m.score_them
  }
  return record
}

/** Most recent first. played_on is compared as a plain 'YYYY-MM-DD' string. */
export function sortMatchesDesc<T extends { played_on: string; id: string }>(
  matches: T[]
): T[] {
  return [...matches].sort((a, b) =>
    a.played_on === b.played_on
      ? b.id.localeCompare(a.id)
      : b.played_on.localeCompare(a.played_on)
  )
}
