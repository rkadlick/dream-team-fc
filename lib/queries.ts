import { createClient } from '@/lib/supabase/server'
import { STAT_KEYS } from '@/lib/stats-config'
import type { MatchRow, PlayerRow, StatRow } from '@/lib/aggregate'
import type { Tables } from '@/lib/database.types'

export type Season = Tables<'seasons'>
export type GameType = Tables<'game_types'>
export type TeamPhoto = Tables<'team_photos'>

/**
 * Kept as a string literal, not built from MATCH_STATS: supabase-js parses this
 * at the type level, so a column missing here becomes a compile error against
 * MatchRow rather than a runtime surprise.
 */
const MATCH_COLUMNS =
  'id, season_id, game_type_id, played_on, division, opponent, home_away, score_us, score_them, opp_own_goals, went_to_overtime, went_to_pks, pk_us, pk_them, result, notes, shots_us, shots_them, shots_on_target_us, shots_on_target_them, tackles_us, tackles_them, possession_us, possession_them, pass_accuracy_us, pass_accuracy_them'

const PLAYER_COLUMNS =
  'id, name, jersey_number, position, is_human, gamertag, user_id, is_active'

/** Stat columns come from the config, so a new stat needs no query changes. */
const STAT_COLUMNS = ['match_id', 'player_id', 'potg_rank', ...STAT_KEYS].join(
  ', '
)

/**
 * Supabase returns { data, error } and never throws. Dropping `error` on the
 * floor turns a schema mismatch — a missing column after a migration has not
 * been applied — into an empty page rather than a visible failure, so every
 * query surfaces it instead.
 */
function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string
): T | null {
  if (result.error) {
    throw new Error(`Failed to load ${what}: ${result.error.message}`)
  }
  return result.data
}

export async function getSeasons(): Promise<Season[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false })
  return unwrap(result, 'seasons') ?? []
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = await createClient()
  const result = await supabase
    .from('seasons')
    .select('*')
    .eq('is_current', true)
    .maybeSingle()
  return unwrap(result, 'the current season') ?? null
}

export async function getGameTypes(): Promise<GameType[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('game_types')
    .select('*')
    .order('name')
  return unwrap(result, 'game types') ?? []
}

export async function getPlayers(): Promise<(PlayerRow & { user_id: string | null })[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .order('is_active', { ascending: false })
    .order('name')
  return unwrap(result, 'players') ?? []
}

export async function getMatches(seasonId?: string): Promise<MatchRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('matches')
    .select(MATCH_COLUMNS)
    .order('played_on', { ascending: false })
  if (seasonId) query = query.eq('season_id', seasonId)
  return unwrap(await query, 'matches') ?? []
}

export async function getMatch(id: string): Promise<MatchRow | null> {
  const supabase = await createClient()
  const result = await supabase
    .from('matches')
    .select(MATCH_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  return unwrap(result, 'the match') ?? null
}

export async function getStatRows(matchIds?: string[]): Promise<StatRow[]> {
  const supabase = await createClient()
  if (matchIds && matchIds.length === 0) return []
  let query = supabase.from('match_player_stats').select(STAT_COLUMNS)
  if (matchIds) query = query.in('match_id', matchIds)
  return (unwrap(await query, 'player stats') ?? []) as unknown as StatRow[]
}

/** Distinct opponents, newest first, for the entry form's autocomplete. */
export async function getOpponents(): Promise<string[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('matches')
    .select('opponent, played_on')
    .order('played_on', { ascending: false })
    .limit(500)
  const seen = new Set<string>()
  for (const row of unwrap(result, 'opponents') ?? []) {
    if (row.opponent) seen.add(row.opponent)
  }
  return [...seen]
}

/** The division of the most recent match overall, used as a form default. */
export async function getLatestDivision(seasonId?: string): Promise<number | null> {
  const supabase = await createClient()
  let query = supabase
    .from('matches')
    .select('division, played_on')
    .order('played_on', { ascending: false })
    .limit(1)
  if (seasonId) query = query.eq('season_id', seasonId)
  return unwrap(await query, 'the latest division')?.[0]?.division ?? null
}

export type MatchVideo = Tables<'match_videos'>
export type RecentVideo = MatchVideo & {
  match: Pick<MatchRow, 'id' | 'opponent' | 'played_on'>
}

const VIDEO_COLUMNS = 'id, match_id, url, title, kind, sort_order, created_at'

export async function getMatchVideos(matchId: string): Promise<MatchVideo[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('match_videos')
    .select(VIDEO_COLUMNS)
    .eq('match_id', matchId)
    .order('sort_order')
    .order('created_at')
  return unwrap(result, 'match videos') ?? []
}

/** Newest videos across all matches, each paired with its match, for the dashboard. */
export async function getRecentVideos(limit: number): Promise<RecentVideo[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('match_videos')
    .select(VIDEO_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  const videos = unwrap(result, 'recent videos') ?? []
  if (videos.length === 0) return []

  const matchIds = [...new Set(videos.map((v) => v.match_id))]
  const matchResult = await supabase
    .from('matches')
    .select('id, opponent, played_on')
    .in('id', matchIds)
  const matches = unwrap(matchResult, 'matches for recent videos') ?? []
  const matchById = new Map(matches.map((m) => [m.id, m]))

  return videos
    .map((v) => {
      const match = matchById.get(v.match_id)
      return match ? { ...v, match } : null
    })
    .filter((v): v is RecentVideo => v !== null)
}

/** Admin-uploaded banner photos, oldest upload first. */
export async function getTeamPhotoUploads(): Promise<TeamPhoto[]> {
  const supabase = await createClient()
  const result = await supabase
    .from('team_photos')
    .select('*')
    .order('created_at', { ascending: true })
  return unwrap(result, 'team photos') ?? []
}
