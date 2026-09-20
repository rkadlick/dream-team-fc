import {
  STATS,
  type StatValues,
  emptyStats,
  pickStats,
} from '@/lib/stats-config'

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
  // Team stats, recorded for both sides. All optional: null is "not tracked".
  // Kept in step with MATCH_STATS in lib/stats-config.ts.
  shots_us: number | null
  shots_them: number | null
  tackles_us: number | null
  tackles_them: number | null
  possession_us: number | null
  possession_them: number | null
  pass_accuracy_us: number | null
  pass_accuracy_them: number | null
}

export type StatRow = {
  match_id: string
  player_id: string
} & Record<string, unknown>

/** An accumulator for one player's stats over some set of matches. */
export type StatBucket = {
  /** null for an optional stat that was never recorded in this set. */
  stats: StatValues
  /**
   * Per stat, the number of matches in which it was actually recorded. This is
   * the denominator for per-game averages: a match where shots were not tracked
   * must not drag a player's shots-per-game down.
   */
  statGames: Record<string, number>
  /** Matches with a stat row. Every player who appeared gets one. */
  games: number
  /** Times named player of the match. */
  potgAwards: number
}

export function emptyBucket(): StatBucket {
  return {
    stats: emptyStats(),
    statGames: Object.fromEntries(STATS.map((s) => [s.key, 0])),
    games: 0,
    potgAwards: 0,
  }
}

/** Fold one match_player_stats row into a bucket. */
export function addRow(bucket: StatBucket, row: StatRow): void {
  // A stat row exists for every player who appeared, human or AI, even at zero,
  // so counting rows is the games-played count.
  bucket.games += 1
  if (row.potg_rank !== null && row.potg_rank !== undefined) {
    bucket.potgAwards += 1
  }

  const values = pickStats(row)
  for (const stat of STATS) {
    const value = values[stat.key]
    // null is "not tracked in this match": it neither adds to the total nor
    // counts toward the average's denominator.
    if (value === null) continue
    bucket.stats[stat.key] = (bucket.stats[stat.key] ?? 0) + value
    bucket.statGames[stat.key] += 1
  }
}

export type PlayerTotals = StatBucket & {
  player: PlayerRow
  /** Alias of `games`, kept for the leaderboard's vocabulary. */
  gamesPlayed: number
}

/**
 * Aggregate stat rows per player. Deliberately done in TypeScript rather than
 * a SQL view so that adding a stat is one migration + one config entry.
 */
export function totalsByPlayer(
  players: PlayerRow[],
  statRows: StatRow[]
): PlayerTotals[] {
  const byId = new Map<string, StatBucket>()
  for (const player of players) byId.set(player.id, emptyBucket())

  for (const row of statRows) {
    const bucket = byId.get(row.player_id)
    if (!bucket) continue
    addRow(bucket, row)
  }

  return players.map((player) => {
    const bucket = byId.get(player.id)!
    return { player, ...bucket, gamesPlayed: bucket.games }
  })
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
