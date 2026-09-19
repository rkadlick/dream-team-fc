import { createClient } from '@/lib/supabase/server'
import { STAT_KEYS } from '@/lib/stats-config'
import type { MatchRow, PlayerRow, StatRow } from '@/lib/aggregate'
import type { Tables } from '@/lib/database.types'

export type Season = Tables<'seasons'>
export type GameType = Tables<'game_types'>

const MATCH_COLUMNS =
  'id, season_id, game_type_id, played_on, division, opponent, home_away, score_us, score_them, opp_own_goals, went_to_overtime, went_to_pks, pk_us, pk_them, result, notes'

const PLAYER_COLUMNS =
  'id, name, jersey_number, position, is_human, gamertag, user_id, is_active'

/** Stat columns come from the config, so a new stat needs no query changes. */
const STAT_COLUMNS = ['match_id', 'player_id', ...STAT_KEYS].join(', ')

export async function getSeasons(): Promise<Season[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false })
  return data ?? []
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_current', true)
    .maybeSingle()
  return data ?? null
}

export async function getGameTypes(): Promise<GameType[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('game_types')
    .select('*')
    .order('name')
  return data ?? []
}

export async function getPlayers(): Promise<(PlayerRow & { user_id: string | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .order('is_active', { ascending: false })
    .order('name')
  return data ?? []
}

export async function getMatches(seasonId?: string): Promise<MatchRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('matches')
    .select(MATCH_COLUMNS)
    .order('played_on', { ascending: false })
  if (seasonId) query = query.eq('season_id', seasonId)
  const { data } = await query
  return data ?? []
}

export async function getMatch(id: string): Promise<MatchRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(MATCH_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}

export async function getStatRows(matchIds?: string[]): Promise<StatRow[]> {
  const supabase = await createClient()
  if (matchIds && matchIds.length === 0) return []
  let query = supabase.from('match_player_stats').select(STAT_COLUMNS)
  if (matchIds) query = query.in('match_id', matchIds)
  const { data } = await query
  return (data ?? []) as unknown as StatRow[]
}

/** Distinct opponents, newest first, for the entry form's autocomplete. */
export async function getOpponents(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select('opponent, played_on')
    .order('played_on', { ascending: false })
    .limit(500)
  const seen = new Set<string>()
  for (const row of data ?? []) {
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
  const { data } = await query
  return data?.[0]?.division ?? null
}
