'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'
import { requireAdmin } from '@/lib/auth'
import { STAT_KEYS } from '@/lib/stats-config'

export type StatLine = { player_id: string } & Record<string, number | string>

export type SaveMatchPayload = {
  id?: string
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
  notes: string
  stats: StatLine[]
  /** Ticked to save with goals that do not add up (backfilling old games). */
  allowUnattributed: boolean
}

export type SaveMatchResult = { error: string }

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

export async function saveMatchAction(
  payload: SaveMatchPayload
): Promise<SaveMatchResult | void> {
  await requireAdmin()

  if (!payload.season_id) return { error: 'Pick a season.' }
  if (!payload.game_type_id) return { error: 'Pick a game type.' }
  if (!payload.played_on) return { error: 'Pick a date.' }
  if (!payload.opponent.trim()) return { error: 'Enter an opponent.' }
  if (payload.division < 1) return { error: 'Division must be 1 or higher.' }
  if (payload.score_us < 0 || payload.score_them < 0) {
    return { error: 'Scores cannot be negative.' }
  }
  if (!['W', 'D', 'L'].includes(payload.result)) {
    return { error: 'Pick a result.' }
  }

  const goalTotal =
    payload.stats.reduce((sum, line) => sum + toInt(line.goals), 0) +
    payload.opp_own_goals

  if (goalTotal !== payload.score_us && !payload.allowUnattributed) {
    return {
      error: `Player goals (${goalTotal - payload.opp_own_goals}) plus opponent own goals (${payload.opp_own_goals}) is ${goalTotal}, but the score says ${payload.score_us}.`,
    }
  }

  const seen = new Set<string>()
  for (const line of payload.stats) {
    if (!line.player_id) return { error: 'A stat row is missing a player.' }
    if (seen.has(line.player_id)) {
      return { error: 'The same player is listed twice.' }
    }
    seen.add(line.player_id)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('save_match', {
    p_match: {
      ...(payload.id ? { id: payload.id } : {}),
      season_id: payload.season_id,
      game_type_id: payload.game_type_id,
      played_on: payload.played_on,
      division: payload.division,
      opponent: payload.opponent.trim(),
      home_away: payload.home_away,
      score_us: payload.score_us,
      score_them: payload.score_them,
      opp_own_goals: payload.opp_own_goals,
      went_to_overtime: payload.went_to_overtime,
      went_to_pks: payload.went_to_pks,
      pk_us: payload.went_to_pks ? payload.pk_us : null,
      pk_them: payload.went_to_pks ? payload.pk_them : null,
      result: payload.result,
      notes: payload.notes.trim(),
    },
    p_stats: payload.stats.map((line) => {
      const row: Record<string, string | number> = { player_id: line.player_id }
      for (const key of STAT_KEYS) row[key] = toInt(line[key])
      return row
    }) as Json,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect(`/matches/${data}`)
}

export async function deleteMatchAction(id: string): Promise<{ error: string } | void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  redirect('/matches')
}

/** Used by the "+ Add new game type" control inside the match form. */
export async function createGameTypeInlineAction(
  name: string
): Promise<{ error: string } | { id: string; name: string }> {
  await requireAdmin()
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Enter a name.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('game_types')
    .insert({ name: trimmed })
    .select('id, name')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { id: data.id, name: data.name }
}
