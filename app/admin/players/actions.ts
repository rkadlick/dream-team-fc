'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { POSITIONS } from '@/lib/constants'

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

export async function createPlayerAction(formData: FormData) {
  await requireAdmin()
  const fields = readPlayerFields(formData)
  if (!fields.name) return

  const supabase = await createClient()
  await supabase.from('players').insert(fields)
  revalidatePath('/', 'layout')
}

export async function updatePlayerAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const fields = readPlayerFields(formData)
  if (!id || !fields.name) return

  const supabase = await createClient()
  await supabase.from('players').update(fields).eq('id', id)
  revalidatePath('/', 'layout')
}

/** Only offered for players with no stat rows; never hard-delete a used player. */
export async function deletePlayerAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  const { count } = await supabase
    .from('match_player_stats')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', id)

  if ((count ?? 0) > 0) {
    // Has history — deactivate instead.
    await supabase.from('players').update({ is_active: false }).eq('id', id)
  } else {
    await supabase.from('players').delete().eq('id', id)
  }
  revalidatePath('/', 'layout')
}

/** Point a roster row at the signed-in admin's auth user, or clear it. */
export async function linkPlayerToMeAction(formData: FormData) {
  const userId = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const unlink = formData.get('unlink') === 'true'
  if (!id) return

  const supabase = await createClient()
  if (unlink) {
    await supabase.from('players').update({ user_id: null }).eq('id', id)
  } else {
    // user_id is unique; clear any previous link for this admin first.
    await supabase.from('players').update({ user_id: null }).eq('user_id', userId)
    await supabase.from('players').update({ user_id: userId }).eq('id', id)
  }
  revalidatePath('/', 'layout')
}
