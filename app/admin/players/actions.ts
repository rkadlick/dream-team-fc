'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { POSITIONS } from '@/lib/constants'
import { fail, ok, type ActionState } from '@/lib/action-state'

function readPlayerFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const jerseyRaw = String(formData.get('jersey_number') ?? '').trim()
  const position = String(formData.get('position') ?? '').trim()
  const gamertag = String(formData.get('gamertag') ?? '').trim()

  return {
    name,
    jersey_number: jerseyRaw === '' ? null : Math.trunc(Number(jerseyRaw)),
    position: (POSITIONS as readonly string[]).includes(position) ? position : null,
    is_human: formData.get('is_human') === 'on',
    gamertag: gamertag === '' ? null : gamertag,
    is_active: formData.get('is_active') === 'on',
  }
}

function validate(fields: ReturnType<typeof readPlayerFields>): string | null {
  if (!fields.name) return 'Give the player a name.'
  if (fields.jersey_number !== null && !Number.isFinite(fields.jersey_number)) {
    return 'Jersey number must be a number.'
  }
  return null
}

export async function createPlayerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const fields = readPlayerFields(formData)
  const problem = validate(fields)
  if (problem) return fail(problem)

  const supabase = await createClient()
  const { error } = await supabase.from('players').insert(fields)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok(`${fields.name} added to the roster.`)
}

export async function updatePlayerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const fields = readPlayerFields(formData)
  if (!id) return fail('Missing player.')
  const problem = validate(fields)
  if (problem) return fail(problem)

  const supabase = await createClient()
  const { error } = await supabase.from('players').update(fields).eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Player saved.')
}

/** Hard delete only for players with no stat rows; otherwise deactivate. */
export async function deletePlayerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return fail('Missing player.')

  const supabase = await createClient()
  const { count } = await supabase
    .from('match_player_stats')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', id)

  if ((count ?? 0) > 0) {
    // Has history — deactivate instead.
    const { error } = await supabase
      .from('players')
      .update({ is_active: false })
      .eq('id', id)
    if (error) return fail(error.message)
    revalidatePath('/', 'layout')
    return ok('Player has recorded stats, so they were deactivated.')
  }

  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Player deleted.')
}

/** Point a roster row at the signed-in admin's auth user, or clear it. */
export async function linkPlayerToMeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const unlink = formData.get('unlink') === 'true'
  if (!id) return fail('Missing player.')

  const supabase = await createClient()
  if (unlink) {
    const { error } = await supabase
      .from('players')
      .update({ user_id: null })
      .eq('id', id)
    if (error) return fail(error.message)
    revalidatePath('/', 'layout')
    return ok('Unlinked from your login.')
  }

  // user_id is unique; clear any previous link for this admin first.
  await supabase.from('players').update({ user_id: null }).eq('user_id', userId)
  const { error } = await supabase
    .from('players')
    .update({ user_id: userId })
    .eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Linked to your login.')
}
